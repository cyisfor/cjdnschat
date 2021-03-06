import socket,select,os

class UDP(socket.socket):
    def __init__(self,loop):
        super().__init__(socket.AF_INET6,socket.SOCK_DGRAM)
        self.loop = loop
    def bind(self,sockaddr):
        super().bind(sockaddr)
    def start_recv(self,handler):
        self.onRead = handler
        self.loop.reads.add(self)
    def send(self,addr,buf):
        super().sendto(buf,addr)

class TTY:
    def __init__(self,loop,fileno,derp):
        self.loop = loop
        self._fileno = fileno
    def fileno(self):
        return self._fileno
    def start_read(self,handler):
        self.onRead = handler
        self.loop.reads.add(self)

class Loop:
    def __init__(self):
        self.reads = set()
        self.buf = bytes(0x1000)
    @staticmethod
    def default_loop():
        return default_loop
    def run(self):
        while self.reads:
            rfds = [it.fileno() for it in self.reads]
            lookup = dict(zip(rfds,self.reads))
            results = select.select(rfds,(),(),None)
            for fd in results[0]:
                if fd in lookup:
                    sock = lookup[fd]
                    try:
                        num, addr = sock.recvfrom_into(self.buf,0x1000)
                        sock.onRead(sock,addr,None,self.buf[:num],None)
                    except AttributeError:
                        buf = os.read(fd,0x1000)
                        if len(buf)==0: raise SystemExit
                        print(sock.onRead)
                        sock.onRead(None,buf,None)


class Signal:
    def __init__(self,loop): pass
    def start(self,handler,sig): pass

default_loop = Loop()
