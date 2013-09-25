try:
    import pyuv
except ImportError:
    print("PYUV not installed! We needs it for sane networking operations! Run [pip3 install pyuv] as root please.")
    import derpyuv as pyuv

try:
    import twisted.web.client
except ImportError:
    print("Did you know twisted works with python3 mostly? It's got a file transfer already written, so please install it. Ignore the failed tests as they're still python2 only syntax.")
    raise SystemExit(3)

import twisted.internet.protocol
from twisted.internet import reactor
from twisted.internet.stdio import StandardIO
import twisted.web.server
import twisted.web.static

twc = twisted.web.client
tip = twisted.internet.protocol

try:
    import twisted_pyuv
    twisted_pyuv.install()
except ImportError:
    print("no pyuv? sigh... please see https://github.com/saghul/twisted-pyuv")

import commands,time

import socket,sys,logging,signal
import re

logging.basicConfig(level=logging.DEBUG)

whitespace = re.compile("\\s+")

def maybeAlias(who):
    return who

class CompleteSender:
    def __init__(self,proto,addr,message):
        self.message = message
        self.proto = proto
        proto.send(addr,message)
    def done(self,proto,status):
        if status != 0:
            logging.error("Sending failed! {}".format(status))
        else:
            logging.debug("Message has been sent")

class Protocol(tip.DatagramProtocol):
    def __init__(self):
        self.pendingTransfers = {}
        self.ports = {}
        self.friends = set()
        self.ibuffer = {}
    def datagramReceived(self,data,derp):
        host,port = derp
        if not host in self.friends:
            logging.debug("ignoring {} from [{}]:{}".format(len(data),host,port))
            return
        self.ports[host] = port
        buf = self.ibuffer.get(host,b"")
        buf += data
        messages = buf.split(b"\0")
        buf = messages[-1]
        messages = messages[:-1]
        self.ibuffer[addr] = buf
        for message in messages:
            self.handle_message(host,message)
    def found_terminator(self):
        line = "".join(self.ibuffer)
    def send(self,addr,message):
        CompleteSender(super(),addr,message)
    def handle_message(self,who,message):
        self.lastAddr = who
        kind = message[0]
        message = message[1:]
        if kind == 0:
            print("<"+maybeAlias(who)+"> "+message.decode('utf-8'))
        elif kind == 1:
            uri = message
            name = uri.rsplit('/',1)[:-1]
            if not name: return
            print(maybeAlias(who)+" is trying to send you "+name)
            print("type /accept {} to accept.".format(name))
            self.pendingTransfers[name] = (who,self.ports[who],uri)
    def getFile(uri,name=None):
        if name is None:
            name = urlparse(uri)[2].rsplit('/',-1)
        try: os.mkdir(public)
        except OSError: pass
        twc.downloadPage(uri,os.path.join(public,name))

class ConsoleHandler(twp.Protocol):
    def __init__(self,sender):
        self.sender = sender
        self.buffer = b""
        super().__init__(loop,sys.stdin.fileno(), True)
        badsigs = [signal.SIGINT,signal.SIGHUP,signal.SIGQUIT]
        self.start_read(self.handle_read)
    def dataReceived(self,data):
        self.buffer += data
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
            if not self.sender.friends:
                print("You have no friends. :(")
            else:
                logging.debug("Sending to {} friends".format(len(self.sender.friends)))
                for addr in self.sender.friends:
                    self.sender.send(addr,line.encode('utf-8'))

def trySetup(addr,port):
    chat = Protocol()
    site = twisted.web.server.Site(twisted.web.static.File(public))
    reactor.listenUDP(port,chat)
    reactor.listenTCP(port+1,site)
    StandardIO(ConsoleHandler(chat))
    print("Tell your friends /add [{}]:{}".format(addr,port))
    with commands.init(stdin):
        reactor.run()
