commands = {}

def run(command,chat,args):
    if command in commands:
        commands[command](chat,*args)
    else:
        print("> No command named "+command+"!")
