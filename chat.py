#!/usr/bin/env python3

import net

import subprocess as s
import re
import io
from contextlib import contextmanager

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
    for line in io.TextIOWrapper(p.stdout):
        result = cjaddr.search(line)
        if result:
            address = result.group(1)
            break
if address is None:
    print("Could not find your cjdns address!")
    raise SystemExit(3)

for port in range(20000,30000):
    net.trySetup(address,port)
