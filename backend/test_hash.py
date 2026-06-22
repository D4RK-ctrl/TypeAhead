from consistent_hash import ConsistentHash

ring = ConsistentHash()

for key in [
    "goo",
    "java",
    "iphone",
    "redis",
    "weather"
]:
    print(
        key,
        "->",
        ring.get_node(key)
    )