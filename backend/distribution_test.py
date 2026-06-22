from consistent_hash import ConsistentHash

ring = ConsistentHash()

cnt = {
    "nodeA": 0,
    "nodeB": 0,
    "nodeC": 0
}

for i in range(10000):

    key = f"query{i}"

    node = ring.get_node(key)

    cnt[node] += 1

print(cnt)