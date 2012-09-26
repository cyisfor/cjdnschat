import commands,time

import asyncore,socket,sys
import re

whitespace = re.compile("\\s+")

def maybeAlias(who):
    return who

class Protocol(asyncore.dispatcher):
    def __init__(self,addr,port):
        self.ibuffer = {}
        self.obuffer = {}
        self.ports = {}
        self.friends = set()
        asyncore.dispatcher.__init__(self)
        self.create_socket(socket.AF_INET6,socket.SOCK_DGRAM)
        self.bind((addr,port))
    def handle_read(self):
        data, addr = self.recvfrom(0x1000)
        if not addr[0] in self.friends:
            print("> ignoring {} from [{}]:{}".format(len(data),addr[0],addr[1]))
            return
        self.ports[addr[0]] = addr[1]
        addr = addr[0]
        buf = self.ibuffer.get(addr,b"")
        buf += data
        messages = buf.split(b"\0")
        buf = messages[-1]
        messages = messages[:-1]
        self.ibuffer[addr] = buf
        for message in messages:
            self.handle_message(addr,message)
    def found_terminator(self):
        line = "".join(self.ibuffer)
    def handle_write(self):
        if len(self.obuffer)==0:
            time.sleep(1)
            return
        for addr in list(self.obuffer.keys()):
            buf = self.obuffer[addr]
            sent = self.sendto(buf, (addr,self.ports.get(addr,20000)))
            if sent < 0:
                break
            else:
                if sent == 0: break
                if buf[sent:]:
                    self.obuffer[addr] =  buf[sent:]
                else:
                    del self.obuffer[addr]
    def queue_send(self,addr,message):
        buf = self.obuffer.get(addr,b"")
        buf += message + b"\0"
        self.obuffer[addr] = buf
    def handle_message(self,who,message):
        self.lastAddr = who
        print("<"+maybeAlias(who)+"> "+message.decode('utf-8'))

class ConsoleHandler(asyncore.file_dispatcher):
    def __init__(self,protocol):
        self.protocol = protocol
        self.buffer = b""
        asyncore.file_dispatcher.__init__(self,sys.stdin)
        commands.init(self)
    def handle_read(self):
        self.buffer += self.recv(0x1000)
        lines = self.buffer.decode('utf-8').split("\n")
        buf = lines[-1]
        lines = lines[:-1]
        self.buffer = buf.encode('utf-8')
        for line in lines:
            self.handle_line(line)
    def handle_line(self,line):
        if line.startswith("/"):
            try: command,args = whitespace.split(line[1:],1)
            except ValueError:
                command = line[1:]
                args = ()
            commands.run(command,self,args)
        else:
            for addr in self.protocol.friends:
                self.protocol.queue_send(addr,line.encode('utf-8'))
    def close(self):
        raise SystemExit

def trySetup(addr,port):
    proto = Protocol(addr,port)
    stdin = ConsoleHandler(proto)
    print("Tell your friends /add [{}]:{}".format(addr,port))
    asyncore.loop()
