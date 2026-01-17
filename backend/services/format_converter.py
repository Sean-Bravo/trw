"""
Lightweight format converter for tax software output formats.

This module contains pure Python functions for converting Koinly-format records
to other tax software formats (TurboTax, CoinLedger, ZenLedger).

No external dependencies - uses only Python standard library.
Designed for use in Lambda functions with minimal package size.
"""

import logging
from enum import Enum
from typing import Any, Dict, List, Tuple

logger = logging.getLogger(__name__)

# Fiat currencies used to detect transaction direction
FIAT_CURRENCIES = {"USD", "EUR", "GBP", "CAD", "AUD", "JPY", "USDT", "USDC", "BUSD", "DAI"}


def safe_float(value: Any, default: float = 0.0) -> float:
    """Safely convert a value to float, handling strings and None."""
    if value is None or value == "":
        return default
    try:
        return float(value)
    except (ValueError, TypeError):
        return default


class OutputFormat(str, Enum):
    """Supported tax software output formats."""
    KOINLY = "koinly"
    TURBOTAX = "turbotax"
    COINLEDGER = "coinledger"
    ZENLEDGER = "zenledger"


def convert_to_turbotax(records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Convert Koinly-format records to TurboTax format (Form 8949 style).

    TurboTax required columns:
    - Currency Name: Asset name with quantity (e.g., "123 DOGE" or "0.5 BTC")
    - Purchase Date: Date acquired (MM/DD/YYYY or YYYY-MM-DD)
    - Cost Basis: Original cost in USD with $ symbol (e.g., "$3000.05")
    - Date Sold: Date disposed (MM/DD/YYYY or YYYY-MM-DD)
    - Proceeds: Sale amount in USD with $ symbol (e.g., "$2000.35")

    Note: TurboTax only handles realized gains/losses (sales/trades),
    not deposits, withdrawals, or income events. Max 2,250-4,000 per file.

    Args:
        records: List of records in Koinly format

    Returns:
        List of records in TurboTax format
    """
    turbotax_records = []

    for record in records:
        # Convert string values to floats
        sent_amount = safe_float(record.get("Sent Amount"))
        received_amount = safe_float(record.get("Received Amount"))
        sent_currency = (record.get("Sent Currency", "") or "").strip()
        received_currency = (record.get("Received Currency", "") or "").strip()
        date = record.get("Date", "") or ""
        fee_amount = safe_float(record.get("Fee Amount"))
        fee_currency = (record.get("Fee Currency", "") or "").strip()

        # Skip if no meaningful transaction
        if not sent_amount and not received_amount:
            continue

        # Extract just the date part and convert YYYY-MM-DD to MM/DD/YYYY
        date_only = date.split(" ")[0] if " " in date else date
        if date_only and "-" in date_only:
            try:
                parts = date_only.split("-")
                if len(parts) == 3:
                    year, month, day = parts
                    date_only = f"{month}/{day}/{year}"
            except (ValueError, IndexError):
                pass  # Keep original format if parsing fails

        is_sell = (sent_currency and
                   sent_currency.upper() not in FIAT_CURRENCIES and
                   received_currency.upper() in FIAT_CURRENCIES)
        is_crypto_to_crypto = (sent_currency and received_currency and
                              sent_currency.upper() not in FIAT_CURRENCIES and
                              received_currency.upper() not in FIAT_CURRENCIES)

        if is_sell:
            # SELL transaction - crypto to fiat (taxable event)
            proceeds = received_amount - fee_amount if fee_currency.upper() in FIAT_CURRENCIES else received_amount
            turbotax_records.append({
                "Currency Name": f"{sent_amount} {sent_currency}",
                "Purchase Date": "",  # User needs to fill from cost basis records
                "Cost Basis": "",     # User needs to fill from cost basis records
                "Date Sold": date_only,
                "Proceeds": f"${proceeds:.2f}" if proceeds else "",
            })
        elif is_crypto_to_crypto:
            # Crypto-to-crypto trade (taxable event - disposal of sent asset)
            turbotax_records.append({
                "Currency Name": f"{sent_amount} {sent_currency}",
                "Purchase Date": "",
                "Cost Basis": "",
                "Date Sold": date_only,
                "Proceeds": "",  # Fair market value unknown - user must determine
            })
        # Note: Buy transactions (fiat to crypto) are NOT included in TurboTax
        # as they are not taxable events - they establish cost basis only

    return turbotax_records


def convert_to_coinledger(records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Convert Koinly-format records to CoinLedger Universal Manual Import format.

    CoinLedger required columns:
    - Timestamp: Date/time in UTC (MM/DD/YYYY HH:mm:ss)
    - Type: Transaction type (Trade, Deposit, Withdrawal, Income, etc.)
    - Asset Received: Token symbol received
    - Amount Received: Quantity received
    - Asset Sent: Token symbol sent
    - Amount Sent: Quantity sent
    - Fee Asset: Fee token symbol (optional)
    - Fee Amount: Fee quantity (optional)

    Key requirements:
    - NO currency symbols ($, €)
    - NO special characters (+, -)
    - Leave unused columns blank (not 0, N/A, or ---)

    Args:
        records: List of records in Koinly format

    Returns:
        List of records in CoinLedger format
    """
    coinledger_records = []

    for record in records:
        sent_amount = safe_float(record.get("Sent Amount"))
        received_amount = safe_float(record.get("Received Amount"))
        sent_currency = (record.get("Sent Currency", "") or "").strip()
        received_currency = (record.get("Received Currency", "") or "").strip()
        date = record.get("Date", "") or ""
        fee_amount = safe_float(record.get("Fee Amount"))
        fee_currency = (record.get("Fee Currency", "") or "").strip()
        label = (record.get("Label", "") or "").strip()

        # Convert date format from YYYY-MM-DD HH:mm:ss to MM/DD/YYYY HH:mm:ss
        timestamp = date
        if date and "-" in date:
            try:
                # Split date and time
                parts = date.split(" ")
                date_part = parts[0]
                time_part = parts[1] if len(parts) > 1 else "00:00:00"
                # Convert YYYY-MM-DD to MM/DD/YYYY
                year, month, day = date_part.split("-")
                timestamp = f"{month}/{day}/{year} {time_part}"
            except (ValueError, IndexError):
                timestamp = date  # Keep original if parsing fails

        # Determine transaction type
        if label and label.upper() in ["STAKING", "AIRDROP", "MINING"]:
            tx_type = "Income"
        elif label and label.upper() == "INCOME":
            tx_type = "Income"
        elif sent_currency.upper() in FIAT_CURRENCIES and received_currency.upper() not in FIAT_CURRENCIES:
            tx_type = "Trade"  # Buy is a type of trade
        elif sent_currency.upper() not in FIAT_CURRENCIES and received_currency.upper() in FIAT_CURRENCIES:
            tx_type = "Trade"  # Sell is a type of trade
        elif sent_currency and received_currency:
            tx_type = "Trade"
        elif received_currency and not sent_currency:
            tx_type = "Deposit"
        elif sent_currency and not received_currency:
            tx_type = "Withdrawal"
        else:
            tx_type = "Trade"

        coinledger_records.append({
            "Timestamp": timestamp,
            "Type": tx_type,
            "Asset Received": received_currency if received_currency else "",
            "Amount Received": received_amount if received_amount else "",
            "Asset Sent": sent_currency if sent_currency else "",
            "Amount Sent": sent_amount if sent_amount else "",
            "Fee Asset": fee_currency if fee_currency else "",
            "Fee Amount": fee_amount if fee_amount else "",
        })

    return coinledger_records


def convert_to_zenledger(records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Convert Koinly-format records to ZenLedger format.

    ZenLedger required columns:
    - Timestamp: UTC 24hr format
    - Type: buy, sell, trade, receive, send, staking, airdrop, mining
    - IN Amount: Quantity received
    - IN Currency: Token symbol received
    - OUT Amount: Quantity sent
    - OUT Currency: Token symbol sent
    - Fee Amount: Fee quantity (optional)
    - Fee Currency: Fee token symbol (optional)
    - Exchange: Exchange name (optional)
    - US-Based: Y/N (optional)

    Args:
        records: List of records in Koinly format

    Returns:
        List of records in ZenLedger format
    """
    zenledger_records = []

    for record in records:
        sent_amount = safe_float(record.get("Sent Amount"))
        received_amount = safe_float(record.get("Received Amount"))
        sent_currency = (record.get("Sent Currency", "") or "").strip()
        received_currency = (record.get("Received Currency", "") or "").strip()
        date = record.get("Date", "") or ""
        fee_amount = safe_float(record.get("Fee Amount"))
        fee_currency = (record.get("Fee Currency", "") or "").strip()
        label = (record.get("Label", "") or "").strip()

        # Determine transaction type for ZenLedger (lowercase per spec)
        if label and label.upper() in ["STAKING", "AIRDROP", "MINING"]:
            tx_type = label.lower()
        elif sent_currency.upper() in FIAT_CURRENCIES and received_currency.upper() not in FIAT_CURRENCIES:
            tx_type = "buy"
        elif sent_currency.upper() not in FIAT_CURRENCIES and received_currency.upper() in FIAT_CURRENCIES:
            tx_type = "sell"
        elif sent_currency and received_currency:
            tx_type = "trade"
        elif received_currency and not sent_currency:
            tx_type = "receive"
        elif sent_currency and not received_currency:
            tx_type = "send"
        else:
            tx_type = "trade"

        zenledger_records.append({
            "Timestamp": date,
            "Type": tx_type,
            "IN Amount": received_amount if received_amount else "",
            "IN Currency": received_currency,
            "OUT Amount": sent_amount if sent_amount else "",
            "OUT Currency": sent_currency,
            "Fee Amount": fee_amount if fee_amount else "",
            "Fee Currency": fee_currency,
            "Exchange": "",  # User can fill if needed
            "US-Based": "",  # User can fill if needed
        })

    return zenledger_records


def convert_records(
    records: List[Dict[str, Any]],
    output_format: str = "koinly"
) -> Tuple[List[Dict[str, Any]], List[str]]:
    """
    Convert records from Koinly format to the specified output format.

    Args:
        records: List of records in Koinly format (from process_file)
        output_format: Target format - "koinly", "turbotax", "coinledger", "zenledger"

    Returns:
        Tuple of (converted_records, fieldnames)
    """
    output_format = output_format.lower().strip()

    if output_format == "koinly" or not output_format:
        # Koinly Universal Template format (YYYY-MM-DD HH:mm:ss)
        fieldnames = [
            "Date", "Sent Amount", "Sent Currency",
            "Received Amount", "Received Currency",
            "Fee Amount", "Fee Currency", "Label", "TxHash", "Description"
        ]
        return records, fieldnames

    elif output_format == "turbotax":
        # TurboTax Gain/Loss Report (Form 8949 style)
        # Only for realized gains/losses, not deposits/withdrawals
        converted = convert_to_turbotax(records)
        fieldnames = [
            "Currency Name", "Purchase Date", "Cost Basis",
            "Date Sold", "Proceeds"
        ]
        return converted, fieldnames

    elif output_format == "coinledger":
        # CoinLedger Universal Manual Import Template
        # NO currency symbols ($, €), NO special characters (+, -)
        converted = convert_to_coinledger(records)
        fieldnames = [
            "Timestamp", "Type", "Asset Received", "Amount Received",
            "Asset Sent", "Amount Sent", "Fee Asset", "Fee Amount"
        ]
        return converted, fieldnames

    elif output_format == "zenledger":
        # ZenLedger Custom CSV format
        converted = convert_to_zenledger(records)
        fieldnames = [
            "Timestamp", "Type", "IN Amount", "IN Currency",
            "OUT Amount", "OUT Currency", "Fee Amount", "Fee Currency",
            "Exchange", "US-Based"
        ]
        return converted, fieldnames

    else:
        logger.warning(f"Unknown output format '{output_format}', defaulting to Koinly")
        return convert_records(records, "koinly")


# Module exports
__all__ = [
    'OutputFormat',
    'convert_records',
    'convert_to_turbotax',
    'convert_to_coinledger',
    'convert_to_zenledger',
    'FIAT_CURRENCIES',
]
