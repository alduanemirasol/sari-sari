from http.server import HTTPServer, SimpleHTTPRequestHandler

HOST = "0.0.0.0"
PORT = 8000

def run_server():
    server = HTTPServer((HOST, PORT), SimpleHTTPRequestHandler)
    print(f"Serving index.html at http://localhost:{PORT}")
    server.serve_forever()

if __name__ == "__main__":
    run_server()
