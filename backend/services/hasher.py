"""
Optimized Hasher Module - Now accepts DataFrame to avoid redundant parsing
"""
import hashlib
import pandas as pd
from typing import Union, Tuple


def generate_hash(input_data: Union[str, pd.DataFrame]) -> Tuple[str, list]:
    """
    Generate MD5 hash of CSV headers.
    
    OPTIMIZED: Now accepts either CSV string OR DataFrame to avoid redundant parsing.
    
    Args:
        input_data: Either raw CSV string OR pandas DataFrame
        
    Returns:
        Tuple of (hash_value, headers_list)
        
    Example:
        # Old way (caused re-parsing):
        hash1, headers1 = generate_hash(csv_text)  # Parse #1
        
        # New way (no re-parsing):
        df = pd.read_csv(...)  # Parse once
        hash2, headers2 = generate_hash(df)  # No parse, just use DataFrame
    """
    
    # OPTIMIZATION: Accept DataFrame to avoid re-parsing
    if isinstance(input_data, pd.DataFrame):
        # DataFrame path - NO parsing needed
        df = input_data
        headers = [str(col).strip().lower() for col in df.columns]
    else:
        # String path - parse only if necessary (backward compatibility)
        csv_text = input_data
        lines = csv_text.strip().split('\n')
        if not lines:
            raise ValueError("CSV is empty")
        
        first_line = lines[0]
        headers = [col.strip().lower() for col in first_line.split(',')]
    
    # Create a normalized header string for hashing
    normalized = ','.join(headers)
    
    # Generate MD5 hash
    hash_value = hashlib.md5(normalized.encode()).hexdigest()
    
    return hash_value, headers


# ============================================================================
# BACKWARD COMPATIBILITY WRAPPER (for existing code that passes strings)
# ============================================================================

def generate_hash_from_string(csv_content: str) -> Tuple[str, list]:
    """
    Legacy function - generates hash from CSV string.
    
    Use generate_hash() instead for better performance.
    Only call this if you don't already have a parsed DataFrame.
    """
    return generate_hash(csv_content)


# ============================================================================
# TESTING
# ============================================================================

if __name__ == "__main__":
    import io
    
    # Test with DataFrame (optimized path)
    print("[Test 1] Using DataFrame (optimized - no parsing)")
    df_test = pd.DataFrame({
        "Date": ["2023-01-01"],
        "Type": ["BUY"],
        "Amount": [1.0]
    })
    hash1, headers1 = generate_hash(df_test)
    print(f"  Hash: {hash1}")
    print(f"  Headers: {headers1}")
    print()
    
    # Test with string (legacy path)
    print("[Test 2] Using CSV string (backward compatible)")
    csv_text = "Date,Type,Amount\n2023-01-01,BUY,1.0"
    hash2, headers2 = generate_hash(csv_text)
    print(f"  Hash: {hash2}")
    print(f"  Headers: {headers2}")
    print()
    
    # Verify both produce same hash
    print("[Test 3] Verification - both methods produce same result")
    print(f"  Hashes match: {hash1 == hash2}")
    print(f"  Headers match: {headers1 == headers2}")