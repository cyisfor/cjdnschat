import shelve,re
commands = {}

savedFriends = shelve.open('friends.shelve','c')
portpat = re.compile("(.*):(.*)")

def addFriend(chat,args):
    result = portpat.match(args)
    if result:
        friend = result.group(1)
        port = result.group(2)
        savedFriends[friend] = port
        chat.protocol.friends.add(friend)
        chat.protocol.ports[friend] = int(port)

commands['add'] = addFriend

def delFriend(chat,args):
    friend = args
    del savedFriends[friend]
    chat.protocol.friends.discard(friend)
    del chat.protocol.ports[friend]
    print("OK")
commands['i'] = commands['ignore'] = delFriend

def init(chat):
    for friend,port in savedFriends.items():
        chat.protocol.friends.add(friend)
        chat.protocol.ports[friend] = int(port)

def listFriends(chat,args):
    print('Your friends:')
    for friend in chat.protocol.friends:
        print(friend)
    print('---')

commands['l'] = commands['list'] = listFriends


def run(command,chat,args):
    if command in commands:
        commands[command](chat,args)
    else:
        print("> No command named "+command+"!")
