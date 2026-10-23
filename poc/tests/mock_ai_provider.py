import json,sys
from http.server import BaseHTTPRequestHandler,HTTPServer
LOG=[]
class H(BaseHTTPRequestHandler):
    def log_message(self,*a): pass
    def do_POST(self):
        body=json.loads(self.rfile.read(int(self.headers['content-length'])))
        rec={"path":self.path,"auth":self.headers.get('authorization'),"xkey":self.headers.get('x-api-key'),"ver":self.headers.get('anthropic-version'),"model":body.get("model"),"has_system":("system" in body) or any(m.get("role")=="system" for m in body.get("messages",[]))}
        open('/tmp/mock_ai.log','a').write(json.dumps(rec)+"\n")
        if self.path.endswith('/chat/completions'): out={"choices":[{"message":{"content":"Pouvez-vous donner un exemple chiffré ?"}}]}
        elif self.path.endswith('/v1/messages'): out={"content":[{"type":"text","text":"Quel a été le résultat concret ?"}]}
        else: self.send_response(404); self.end_headers(); return
        b=json.dumps(out).encode(); self.send_response(200); self.send_header('content-type','application/json'); self.end_headers(); self.wfile.write(b)
HTTPServer(('127.0.0.1',int(sys.argv[1])),H).serve_forever()
