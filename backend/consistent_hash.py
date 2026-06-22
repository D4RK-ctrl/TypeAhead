import hashlib
import bisect


class ConsistentHash:

    def __init__(self):

        self.ring = {}
        self.sorted_keys = []

        self.nodes = [
            "nodeA",
            "nodeB",
            "nodeC"
        ]

        self.virtual_nodes = 20

        for node in self.nodes:

            for i in range(self.virtual_nodes):

                vnode = f"{node}#{i}"

                h = self.hash(vnode)

                self.ring[h] = node

                self.sorted_keys.append(h)

        self.sorted_keys.sort()

    def hash(self, key):

        return int(
            hashlib.md5(
                key.encode()
            ).hexdigest(),
            16
        )

    def get_node(self, key):

        h = self.hash(key)

        idx = bisect.bisect(
            self.sorted_keys,
            h
        )

        if idx == len(self.sorted_keys):
            idx = 0

        return self.ring[
            self.sorted_keys[idx]
        ]