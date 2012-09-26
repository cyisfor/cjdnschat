import subprocess as s
import re
import io
from contextlib import contextmanager

import net

numcolon = re.compile("^[0-9]+:")
cjaddr = re.compile("inet6 (fc[0-9a-f]{0,2}:(?:[0-9a-f]{0,4}:){6}[0-9a-f]{0,4})/8 scope global")

address = None

@contextmanager
def waiting(*a,**kw):
    p = None
    try:
        p = s.Popen(*a,**kw)
        yield p
    finally:
        if p: p.wait()

with waiting(["ip","addr"],stdout=s.PIPE) as p:
    foundTun = False
    for line in io.TextIOWrapper(p.stdout):
        if foundTun is False:
            if "tun0" in line:
                foundTun = True
        else:
            if numcolon.search(line): break
            result = cjaddr.search(line)
            if result:
                address = result.group(1)
if address is None:
    print("Could not find your cjdns address!")
    raise SystemExit(3)

for port in range(20000,30000):
    net.trySetup(address,port)
