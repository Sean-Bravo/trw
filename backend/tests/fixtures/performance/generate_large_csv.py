#!/usr/bin/env python3
"""Generate large CSV files for performance testing."""
import random
from datetime import datetime, timedelta

def generate_coinbase_csv(num_rows, filename):
    """Generate a Coinbase-format CSV with the specified number of rows."""
    
    assets = ['BTC', 'ETH', 'SOL', 'DOGE', 'ADA', 'XRP', 'DOT', 'LINK', 'AVAX', 'MATIC']
    tx_types = ['Buy', 'Sell', 'Send', 'Receive']
    
    with open(filename, 'w') as f:
        # Coinbase header format
        f.write('\n')
        f.write('Transactions\n')
        f.write('"User,John Doe,abc123-def456-uuid"\n')
        f.write('ID,Timestamp,Transaction Type,Asset,Quantity Transacted,Price Currency,Price at Transaction,Subtotal,Total (inclusive of fees and/or spread),Fees and/or Spread,Notes\n')
        
        start_date = datetime(2024, 1, 1)
        
        for i in range(num_rows):
            tx_id = f'tx{i+1:06d}'
            timestamp = start_date + timedelta(hours=i)
            tx_type = random.choice(tx_types)
            asset = random.choice(assets)
            quantity = round(random.uniform(0.001, 10.0), 6)
            if tx_type == 'Send':
                quantity = -quantity
            price = round(random.uniform(100, 50000), 2)
            subtotal = round(abs(quantity) * price, 2)
            fee = round(subtotal * 0.01, 2)  # 1% fee
            total = subtotal + fee if tx_type == 'Buy' else subtotal - fee
            notes = ''
            if tx_type == 'Send':
                notes = 'Withdrawal'
            elif tx_type == 'Receive':
                notes = 'Deposit'
            
            f.write(f'{tx_id},{timestamp.isoformat()}Z,{tx_type},{asset},{quantity},USD,{price},{subtotal},{total:.2f},{fee},{notes}\n')
    
    print(f'Generated {filename} with {num_rows} rows')

if __name__ == '__main__':
    generate_coinbase_csv(1000, 'coinbase_1k_rows.csv')
    generate_coinbase_csv(10000, 'coinbase_10k_rows.csv')
    print('Done!')
