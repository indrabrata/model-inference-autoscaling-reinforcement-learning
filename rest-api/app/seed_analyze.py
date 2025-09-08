import random
import datetime
import json

# Categories for transactions
categories = ["food", "transport", "entertainment", "shopping", "bills", "salary", "health", "education"]

# Function to generate random timestamp
def random_timestamp(start, end):
    return (start + datetime.timedelta(seconds=random.randint(0, int((end - start).total_seconds())))).isoformat()

# Generate 100 transactions
transactions = []
start_date = datetime.datetime(2023, 1, 1)
end_date = datetime.datetime(2023, 12, 31)

for i in range(100):
    transaction = {
        "id": i,
        "amount": round(random.uniform(5, 5000), 2),  # Random amount between 5 and 5000
        "category": random.choice(categories),
        "user_id": random.randint(1, 10),  # Random user_id between 1 and 10
        "ts": random_timestamp(start_date, end_date)
    }
    transactions.append(transaction)

# Wrap in the JSON structure
result = {
    "transactions": transactions,
    "expand_factor": 1,
    "heavy_agg": False
}

# Save example output as string
json_output = json.dumps(result, indent=2)

# Save the generated JSON into a file named seed_analyze.json
output_path = "./seed_analyze.json"
with open(output_path, "w") as f:
    f.write(json_output)

