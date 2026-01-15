#!/usr/bin/env python3
"""
Test Fixture Generator for Exchange CSV Detection

Generates test CSV files for:
1. Valid exchange formats (golden master tests)
2. Ambiguous files (negative tests - should NOT match)
3. Edge cases (encoding, delimiters, empty files)

Run: python tests/generate_fixtures.py
"""

import os
import codecs

# Define output directories
FIXTURES_DIR = os.path.join(os.path.dirname(__file__), "fixtures")
VALID_DIR = os.path.join(FIXTURES_DIR, "valid")
AMBIGUOUS_DIR = os.path.join(FIXTURES_DIR, "ambiguous")
EDGE_CASES_DIR = os.path.join(FIXTURES_DIR, "edge_cases")

# Ensure directories exist
for d in [VALID_DIR, AMBIGUOUS_DIR, EDGE_CASES_DIR]:
    os.makedirs(d, exist_ok=True)


def save_csv(name: str, content: str, folder: str = "valid", encoding: str = "utf-8"):
    """Save raw CSV content to file."""
    folder_map = {
        "valid": VALID_DIR,
        "ambiguous": AMBIGUOUS_DIR,
        "edge_cases": EDGE_CASES_DIR,
    }
    path = os.path.join(folder_map[folder], f"{name}.csv")

    with open(path, "w", encoding=encoding, newline="") as f:
        f.write(content)

    print(f"✓ Created {path}")


def save_csv_with_bom(name: str, content: str, folder: str = "edge_cases"):
    """Save CSV with UTF-8 BOM marker."""
    folder_map = {
        "valid": VALID_DIR,
        "ambiguous": AMBIGUOUS_DIR,
        "edge_cases": EDGE_CASES_DIR,
    }
    path = os.path.join(folder_map[folder], f"{name}.csv")

    with codecs.open(path, "w", encoding="utf-8-sig") as f:
        f.write(content)

    print(f"✓ Created {path} (with BOM)")


def generate_valid_fixtures():
    """Generate valid exchange CSV fixtures."""
    print("\n=== Generating Valid Exchange Fixtures ===\n")

    # 1. Binance - Requires 'Pair', 'Side', 'Date(UTC)'
    save_csv("binance_valid", """Date(UTC),Pair,Side,Price,Executed,Amount,Fee
2024-01-01 12:00:00,BTCUSDT,BUY,45000.00,0.5,22500.00,10.00
2024-01-02 14:30:00,ETHUSDT,SELL,2500.00,10.0,25000.00,5.00
2024-01-03 09:15:00,SOLUSDT,BUY,98.50,100.0,9850.00,4.00""")

    # 2. Coinbase (Legacy format) - 'Transaction Type', 'Asset', 'Timestamp'
    save_csv("coinbase_legacy_valid", """Timestamp,Transaction Type,Asset,Quantity Transacted,Spot Price at Transaction,Subtotal,Total (inclusive of fees),Fees and/or Spread
2024-01-01 10:00:00 UTC,Buy,BTC,0.1,40000.00,4000.00,4010.00,10.00
2024-01-05 09:00:00 UTC,Sell,ETH,1.5,2200.00,3300.00,3290.00,10.00
2024-01-10 14:30:00 UTC,Send,BTC,0.05,42000.00,2100.00,2100.00,0.00""")

    # 3. Coinbase 2025 format - Has metadata rows before headers
    save_csv("coinbase_2025_valid", """
Transactions
"User,John Doe,abc123-def456-uuid"
ID,Timestamp,Transaction Type,Asset,Quantity Transacted,Price Currency,Price at Transaction,Subtotal,Total (inclusive of fees and/or spread),Fees and/or Spread,Notes
tx001,2024-01-01T10:00:00Z,Buy,BTC,0.1,USD,40000.00,4000.00,4010.00,10.00,
tx002,2024-01-05T09:00:00Z,Sell,ETH,1.5,USD,2200.00,3300.00,3290.00,10.00,
tx003,2024-01-10T14:30:00Z,Send,BTC,-0.05,USD,42000.00,2100.00,2100.00,0.00,Withdrawal
tx004,2024-01-15T08:00:00Z,Receive,ETH,2.0,USD,2400.00,4800.00,4800.00,0.00,Deposit""")

    # 4. Kraken - Requires 'txid' OR 'refid'
    save_csv("kraken_valid", """txid,refid,time,type,subtype,aclass,asset,amount,fee,balance
TE12345,REF123,2024-01-01 12:00:00,trade,,currency,XXBT,0.5,0.0,1.5
TE67890,REF456,2024-01-02 14:00:00,staking,,currency,ZEUR,20000.0,0.0,50000.0
TE11111,REF789,2024-01-03 10:00:00,deposit,,currency,XETH,5.0,0.0,5.0""")

    # 5. KuCoin - Detection looks for 'trade_pair' or 'trade pair'
    save_csv("kucoin_valid", """Time,Trade Pair,Side,Order Type,Avg. Filled Price,Filled Amount,Filled Volume,Fee,Fee Currency
2024-01-01 10:00:00,BTC-USDT,buy,market,45000.00,0.1,4500.00,4.50,USDT
2024-01-02 14:30:00,ETH-USDT,sell,limit,2500.00,5.0,12500.00,12.50,USDT""")

    # 6. Bybit - Detection looks for 'symbol' + 'orderid'
    save_csv("bybit_valid", """Time,Symbol,Side,OrderId,Price,Qty,Fee,Fee Currency
2024-01-01 10:00:00,BTCUSDT,Buy,ORD001,45000.00,0.1,4.50,USDT
2024-01-02 14:00:00,ETHUSDT,Sell,ORD002,2500.00,5.0,12.50,USDT
2024-01-03 09:00:00,SOLUSDT,Buy,ORD003,100.00,50.0,5.00,USDT""")

    # 7. Gemini - 'Date', 'Type', with specific Gemini transaction types
    save_csv("gemini_valid", """Date,Time (UTC),Type,Symbol,Specification,Liquidity Indicator,Trading Fee Rate (bps),USD Amount,Trading Fee (USD),USD Balance,BTC Amount,BTC Balance
2024-01-01,10:00:00,Buy,BTCUSD,Limit,Maker,10,4500.00,4.50,50000.00,0.1,1.1
2024-01-02,14:30:00,Sell,ETHUSD,Market,Taker,25,2500.00,6.25,52493.75,0.0,1.1""")

    # 8. Crypto.com - 'Transaction Kind', 'Native Currency'
    save_csv("crypto_com_valid", """Timestamp (UTC),Transaction Description,Currency,Amount,To Currency,To Amount,Native Currency,Native Amount,Native Amount (in USD),Transaction Kind,Transaction Hash
2024-01-01 10:00:00,Buy BTC,BTC,0.1,,,USD,4500.00,4500.00,crypto_purchase,0xabc123
2024-01-02 14:30:00,Sell ETH,ETH,-2.0,USD,5000.00,USD,5000.00,5000.00,crypto_sale,0xdef456
2024-01-03 09:00:00,CRO Stake,CRO,1000.0,,,USD,150.00,150.00,lockup_lock,0xghi789""")

    # 9. Robinhood - Detection looks for 'activity date' + 'token'
    # IMPORTANT: Different from Coinbase - must have 'activity date' AND 'token'
    save_csv("robinhood_valid", """Activity Date,Process Date,Settle Date,Token,Description,Trans Code,Quantity,Price,Amount
2024-01-01,2024-01-02,2024-01-03,BTC,Bitcoin Buy,BUY,0.001,45000.00,45.00
2024-01-05,2024-01-06,2024-01-07,ETH,Ethereum Sell,SELL,0.5,2500.00,1250.00
2024-01-10,2024-01-11,2024-01-12,DOGE,Dogecoin Buy,BUY,1000,0.08,80.00""")

    # 10. PayPal - 'Gross', 'Status', 'Crypto' in Type column
    save_csv("paypal_valid", """Date,Time,TimeZone,Name,Type,Status,Currency,Gross,Fee,Net,From Email Address,To Email Address,Transaction ID
01/01/2024,12:00:00,PST,PayPal Crypto,General Crypto Buy,Completed,USD,-100.00,0.00,-100.00,user@example.com,,TXN123
01/15/2024,14:30:00,PST,PayPal Crypto,General Crypto Sell,Completed,USD,500.00,10.00,490.00,user@example.com,,TXN456
02/01/2024,09:00:00,PST,PayPal Crypto,Crypto Currency Purchase,Completed,USD,-250.00,2.50,-252.50,user@example.com,,TXN789""")

    # 11. Cash App - Detection looks for 'asset type' or 'transaction type' + 'bitcoin' in column name
    save_csv("cashapp_valid", """Transaction ID,Date,Transaction Type,Currency,Amount,Fee,Net Amount,Asset Type,Asset Price,Bitcoin Amount
CA123,2024-01-01,Bitcoin Buy,USD,-50.00,1.00,-51.00,BTC,40000.00,0.00125
CA456,2024-02-01,Bitcoin Sale,USD,100.00,2.00,98.00,BTC,42000.00,0.00238
CA789,2024-03-01,Bitcoin Buy,USD,-200.00,4.00,-204.00,BTC,45000.00,0.00444""")

    # 12. Bitfinex - '#' as first column
    save_csv("bitfinex_valid", """#,PAIR,AMOUNT,PRICE,FEE,FEE CURRENCY,DATE,TYPE
123456,BTCUSD,0.1,40000.0,0.002,BTC,2024-01-01 10:00:00,EXCHANGE TRADE
123457,ETHUSD,-0.5,2500.0,0.002,ETH,2024-01-02 11:00:00,EXCHANGE TRADE
123458,XRPUSD,1000.0,0.55,5.0,XRP,2024-01-03 09:30:00,EXCHANGE TRADE""")

    # 13. OKX - 'Instrument ID', 'Order ID', 'Trade ID'
    save_csv("okx_valid", """Trade ID,Order ID,Instrument ID,Side,Fill Price,Fill Size,Fee,Fee Currency,Trade Time
T001,O001,BTC-USDT,buy,45000.00,0.1,4.50,USDT,2024-01-01 10:00:00
T002,O002,ETH-USDT,sell,2500.00,5.0,12.50,USDT,2024-01-02 14:30:00
T003,O003,SOL-USDT,buy,100.00,50.0,5.00,USDT,2024-01-03 09:00:00""")

    # 14. FTX (historical) - 'Market', 'Side', 'Order Type'
    save_csv("ftx_valid", """ID,Time,Market,Side,Order Type,Size,Price,Total,Fee,Fee Currency,Status
1001,2024-01-01 10:00:00,BTC/USD,buy,limit,0.1,45000.00,4500.00,4.50,USD,closed
1002,2024-01-02 14:30:00,ETH/USD,sell,market,5.0,2500.00,12500.00,12.50,USD,closed""")


def generate_ambiguous_fixtures():
    """Generate ambiguous/negative test fixtures that should NOT match any exchange."""
    print("\n=== Generating Ambiguous Fixtures (Should NOT Match) ===\n")

    # 1. Generic bank statement - common columns but no crypto indicators
    save_csv("bank_statement", """Date,Description,Debit,Credit,Balance
01/01/2024,Starbucks Coffee,5.50,,4500.00
01/02/2024,Rent Payment,1500.00,,3000.00
01/03/2024,Salary Deposit,,5000.00,8000.00
01/05/2024,Amazon.com,89.99,,7910.01""", folder="ambiguous")

    # 2. Generic accounting export
    save_csv("accounting_export", """Date,Item,Category,Amount
2024-01-01,Consulting Services,Income,5000.00
2024-01-02,Office Supplies,Expense,-150.00
2024-01-03,Software License,Expense,-99.00""", folder="ambiguous")

    # 3. Stock trading (not crypto) - similar structure but wrong context
    save_csv("stock_trades", """Trade Date,Symbol,Action,Quantity,Price,Total,Commission
2024-01-01,AAPL,BUY,100,185.00,18500.00,9.99
2024-01-02,MSFT,SELL,50,375.00,18750.00,9.99
2024-01-03,GOOGL,BUY,25,140.00,3500.00,9.99""", folder="ambiguous")

    # 4. Random spreadsheet with Date/Amount (very common false positive trigger)
    save_csv("sales_data", """Date,Customer,Product,Quantity,Amount,Region
2024-01-01,Acme Corp,Widget A,100,5000.00,North
2024-01-02,Beta Inc,Widget B,50,2500.00,South
2024-01-03,Gamma LLC,Widget C,75,3750.00,East""", folder="ambiguous")

    # 5. Invoice export
    save_csv("invoices", """Invoice Number,Date,Customer,Amount,Status,Due Date
INV001,2024-01-01,Client A,1500.00,Paid,2024-01-15
INV002,2024-01-05,Client B,2500.00,Pending,2024-01-20
INV003,2024-01-10,Client C,750.00,Overdue,2024-01-25""", folder="ambiguous")

    # 6. Has 'transaction' but not crypto
    save_csv("banking_transactions", """Transaction ID,Date,Description,Amount,Balance,Category
TXN001,2024-01-01,Direct Deposit,3500.00,10500.00,Income
TXN002,2024-01-02,Electric Bill,-150.00,10350.00,Utilities
TXN003,2024-01-03,Grocery Store,-89.50,10260.50,Food""", folder="ambiguous")

    # 7. Has similar structure to Coinbase but wrong headers
    save_csv("fake_coinbase", """Date,Type,Currency,Quantity,Price,Total
2024-01-01,Purchase,USD,100,1.00,100.00
2024-01-02,Sale,USD,50,1.00,50.00""", folder="ambiguous")


def generate_edge_case_fixtures():
    """Generate edge case fixtures for robustness testing."""
    print("\n=== Generating Edge Case Fixtures ===\n")

    # 1. Empty file
    save_csv("empty_file", "", folder="edge_cases")

    # 2. Header only (no data rows)
    save_csv("header_only", """Date,Transaction Type,Asset,Amount,Price,Fee""", folder="edge_cases")

    # 3. Single data row
    save_csv("single_row", """Timestamp,Transaction Type,Asset,Quantity Transacted,Price,Fee
2024-01-01 10:00:00 UTC,Buy,BTC,0.1,40000.00,10.00""", folder="edge_cases")

    # 4. UTF-8 BOM marker (common in Excel exports)
    save_csv_with_bom("utf8_bom_coinbase", """Timestamp,Transaction Type,Asset,Quantity Transacted,Price,Fee
2024-01-01 10:00:00 UTC,Buy,BTC,0.1,40000.00,10.00
2024-01-02 14:30:00 UTC,Sell,ETH,1.5,2500.00,5.00""")

    # 5. Semicolon delimiter (European format)
    save_csv("semicolon_delimiter", """Date(UTC);Pair;Side;Price;Executed;Amount;Fee
2024-01-01 12:00:00;BTCUSDT;BUY;45000,00;0,5;22500,00;10,00
2024-01-02 14:30:00;ETHUSDT;SELL;2500,00;10,0;25000,00;5,00""", folder="edge_cases")

    # 6. Tab delimiter
    save_csv("tab_delimiter", """Date(UTC)\tPair\tSide\tPrice\tExecuted\tAmount\tFee
2024-01-01 12:00:00\tBTCUSDT\tBUY\t45000.00\t0.5\t22500.00\t10.00
2024-01-02 14:30:00\tETHUSDT\tSELL\t2500.00\t10.0\t25000.00\t5.00""", folder="edge_cases")

    # 7. Extra whitespace in headers
    save_csv("whitespace_headers", """  Date(UTC)  ,  Pair  ,  Side  ,  Price  ,  Executed  ,  Amount  ,  Fee
2024-01-01 12:00:00,BTCUSDT,BUY,45000.00,0.5,22500.00,10.00""", folder="edge_cases")

    # 8. Mixed case headers
    save_csv("mixed_case_headers", """TIMESTAMP,transaction type,Asset,QUANTITY TRANSACTED,Price,fee
2024-01-01 10:00:00 UTC,Buy,BTC,0.1,40000.00,10.00""", folder="edge_cases")

    # 9. Quoted fields with commas
    save_csv("quoted_fields", """Date,Description,Transaction Type,Asset,Amount,Fee
2024-01-01,"Buy Bitcoin, 0.1 BTC",Buy,BTC,4000.00,10.00
2024-01-02,"Sell Ethereum, market order",Sell,ETH,2500.00,5.00""", folder="edge_cases")

    # 10. Large file simulation (100 rows)
    rows = ["Timestamp,Transaction Type,Asset,Quantity Transacted,Price,Fee"]
    for i in range(100):
        date = f"2024-{(i // 30) + 1:02d}-{(i % 28) + 1:02d} 10:00:00 UTC"
        tx_type = "Buy" if i % 2 == 0 else "Sell"
        asset = ["BTC", "ETH", "SOL", "DOGE"][i % 4]
        qty = round(0.1 * (i + 1), 4)
        price = [40000, 2500, 100, 0.08][i % 4]
        fee = round(price * qty * 0.001, 2)
        rows.append(f"{date},{tx_type},{asset},{qty},{price},{fee}")
    save_csv("large_file_coinbase", "\n".join(rows), folder="edge_cases")

    # 11. Unicode characters in data
    save_csv("unicode_data", """Timestamp,Transaction Type,Asset,Notes,Amount,Fee
2024-01-01 10:00:00 UTC,Buy,BTC,购买比特币,0.1,10.00
2024-01-02 14:30:00 UTC,Sell,ETH,Продажа эфира,1.5,5.00
2024-01-03 09:00:00 UTC,Send,SOL,Überweisung,10.0,0.01""", folder="edge_cases")

    # 12. Windows line endings (CRLF)
    content = "Timestamp,Transaction Type,Asset,Amount,Fee\r\n"
    content += "2024-01-01 10:00:00 UTC,Buy,BTC,0.1,10.00\r\n"
    content += "2024-01-02 14:30:00 UTC,Sell,ETH,1.5,5.00\r\n"
    path = os.path.join(EDGE_CASES_DIR, "windows_line_endings.csv")
    with open(path, "w", newline="") as f:
        f.write(content)
    print(f"✓ Created {path} (CRLF)")

    # 13. Multiple blank lines in header area (like Coinbase 2025)
    save_csv("multiple_blank_lines", """


Transactions
User Info Row
Timestamp,Transaction Type,Asset,Quantity Transacted,Price,Fee
2024-01-01 10:00:00 UTC,Buy,BTC,0.1,40000.00,10.00""", folder="edge_cases")


def main():
    print("=" * 60)
    print("Test Fixture Generator for Exchange CSV Detection")
    print("=" * 60)

    generate_valid_fixtures()
    generate_ambiguous_fixtures()
    generate_edge_case_fixtures()

    print("\n" + "=" * 60)
    print("Generation complete!")
    print(f"Valid fixtures:     {VALID_DIR}")
    print(f"Ambiguous fixtures: {AMBIGUOUS_DIR}")
    print(f"Edge cases:         {EDGE_CASES_DIR}")
    print("=" * 60)


if __name__ == "__main__":
    main()
