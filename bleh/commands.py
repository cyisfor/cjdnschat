import textwrap
import shelve,re
from contextlib import closing,contextmanager

from urllib.parse import urlparse,urlunparse

commands = {}
alias = {}

savedFriends = None

shelve.open('friends.shelve','c')
portpat = re.compile("\[(.*)\]:(.*)")

def addFriend(chat,args):
    "Add a friend so they can chat with you. Both you and your friend have to add each other in order to chat."
    result = portpat.match(args)
    if result:
        friend = result.group(1)
        port = int(result.group(2))
        savedFriends[friend] = port
        chat.protocol.friends.add((friend,port))
        if port:
            chat.protocol.ports[friend] = int(port)
        else:
            chat.protocol.ports[friend] = 20000

commands['add'] = [addFriend,'<friend>']

def delFriend(chat,args):
    "Remove a friend so they can't chat with you."
    friend = args
    port = savedFriends.get(friend)
    if not port: return
    del savedFriends[friend]
    chat.protocol.friends.discard((friend,port))
    del chat.protocol.ports[friend]
    print("OK")
commands['ignore'] = [delFriend,"<friend>"]
alias['i'] = 'ignore'

@contextmanager
def init(chat):
    global savedFriends
    with closing(shelve.open('friends.shelve','c')) as savedFriends:
        for friend,port in savedFriends.items():
            if type(port)==str:
                port = int(port)
            chat.protocol.friends.add((friend,port))
            chat.protocol.ports[friend] = port
        yield savedFriends

def listFriends(chat,args):
    "List your current friends, whom you chat with."
    print('Your friends:')
    for friend in chat.protocol.friends:
        print(friend)
    print('---')

commands['list'] = [listFriends]
alias['l'] = 'list'

def doHelp(chat,args):
    "Show this help message."
    print(textwrap.fill("Decentralized chat! Chat with any of your friends who are online. Wherever it says <friend> means the [...]:... address/port that is printed at the top of each of your chat sessions. To find friends, ask around! This chat is too cheap for automatic friend discovery. :p"))
    print('')
    print("Commands:")
    for name,command in commands.items():
        print('/'+name,' '.join(command[1:])+":",command[0].__doc__)
        if name in ralias:
            print('Aliases: ',' '.join(['/'+alias for alias in ralias[name]]))

commands['help'] = [doHelp]
alias['?'] = 'help'

def doQuit(chat,args):
    "Quit chatting. Signaling EOF condition (via Ctrl+D) may work also."
    raise SystemExit

def doAccept(chat,args):
    name = args[0]
    info = chat.pendingTransfers.get(name)
    if not info:
        print("You haven't been requested to accept that!")
    who,port,uri = info
    uri = urlparse(uri)
    uri = urlunparse(('http',who+':{}'.format(port))+uri[2:])
    chat.getFile(uri,name)

def doGet(chat,args):
    chat.getFile(args)

commands['accept'] = [doAccept]
commands['get'] = [doGet]
commands['quit'] = [doQuit]
alias['q'] = 'quit'
alias['a'] = 'accept'
alias['g'] = 'get'

ralias = {}
for n,v in alias.items():
    rv = ralias.get(v,[])
    rv.append(n)
    ralias[v] = rv

def run(command,chat,args):
    command = alias.get(command,command)
    if command in commands:
        commands[command][0](chat,args)
    else:
        print("> No command named "+command+"!")
