import asyncio
from typing import List

from tno.mpc.communication.pool import Pool
from tno.mpc.protocols.distributed_keygen import DistributedPaillier

corruption_threshold = 1  # corruption threshold
key_length = 128  # bit length of private key
prime_thresh = 2000  # threshold for primality check
correct_param_biprime = 40  # correctness parameter for biprimality test
stat_sec_shamir = (
    40  # statistical security parameter for secret sharing over the integers
)

PARTIES = 4  # number of parties that will be involved in the protocol, you can change this to any number you like

def setup_local_pool(server_port: int, ports: List[int]) -> Pool:
    pool = Pool()
    pool.add_http_server(server_port)
    for client_port in (port for port in ports if port != server_port):
        pool.add_http_client(f"client{client_port}", "localhost", client_port)
    return pool


local_ports = [3000 + i for i in range(PARTIES)]
local_pools = [
    setup_local_pool(server_port, local_ports) for server_port in local_ports
]

loop = asyncio.get_event_loop()
async_coroutines = [
    DistributedPaillier.from_security_parameter(
        pool,
        corruption_threshold,
        key_length,
        prime_thresh,
        correct_param_biprime,
        stat_sec_shamir,
        distributed=False,
    )
    for pool in local_pools
]
print("Starting distributed key generation protocol.")
distributed_paillier_schemes = loop.run_until_complete(
    asyncio.gather(*async_coroutines)
)

print("The protocol has completed.")

