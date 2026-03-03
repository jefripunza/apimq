# ApiMQ

ApiMQ is a lightweight, self-hosted **HTTP Message Queue** for queuing HTTP requests and processing them reliably using a worker.

## Docker Hub

Official image:

- `jefriherditriyanto/apimq`

Pull:

```bash
docker pull jefriherditriyanto/apimq:latest
```

Run:

```bash
docker run --rm -p 3000:3000 --name apimq \
  -v system:/app/system.sqlite \
  jefriherditriyanto/apimq:latest
```

For production, it's recommended to run with environment variables (example):

```bash
docker run --rm -p 3000:3000 --name apimq \
  -v system:/app/system.sqlite \
  -e PORT=3000 \
  -e JWT_SECRET="change-me" \
  -e DATABASE_PROVIDER="mysql" \
  -e DATABASE_HOST="localhost" \
  -e DATABASE_PORT="3306" \
  -e DATABASE_USER="root" \
  -e DATABASE_PASS="password" \
  -e DATABASE_NAME="apimq" \
  jefriherditriyanto/apimq:latest
```

After the container is running, open:

- `http://localhost:3000`
- Docs UI: `http://localhost:3000/doc`

## Notes

- For production, you **must** set `JWT_SECRET` to a strong value.
- If you enable API keys, make sure they are distributed securely.
- Whitelist can be used to restrict access to the `/queue` endpoint.

## Credits

- Developed by [jefripunza](https://github.com/jefripunza)
- Open source &middot; [Built with Go + React + TailwindCSS](https://github.com/jefripunza/apimq)
