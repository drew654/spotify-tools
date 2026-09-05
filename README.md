# 🎵 Spotify Tools

A self-hosted Next.js app that gives you extra tools for your Spotify account - including a true shuffle, playback history, and more. Designed to run as a Docker container on your home server or NAS.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Step 1 - Get Your Spotify API Credentials](#step-1--get-your-spotify-api-credentials)
3. [Step 2 - Set Up a Callback Domain with Nginx Proxy Manager](#step-2--set-up-a-callback-domain-with-nginx-proxy-manager)
4. [Step 3 - Configure Environment Variables](#step-3--configure-environment-variables)
5. [Step 4 - Run with Docker](#step-4--run-with-docker)
6. [Step 5 - Log In and Authorize](#step-5--log-in-and-authorize)
7. [Updating](#updating)
8. [Backing Up Your Data](#backing-up-your-data)
9. [Troubleshooting](#troubleshooting)
10. [Development (Local, No Docker)](#development-local-no-docker)

---

## Prerequisites

### Required

* [Docker](https://docs.docker.com/get-docker/) installed on your server or machine
* A [Spotify](https://www.spotify.com) account
* A Spotify Developer application with a **Client ID** and **Client Secret**
* A domain or subdomain that you can configure in DNS

### Optional

* A [Spotify Premium](https://www.spotify.com/premium/) account is required for adding songs to the Spotify playback queue.
* [Nginx Proxy Manager](https://nginxproxymanager.com/) or another reverse proxy for accessing the app through an HTTPS domain.

> **Why a domain?**
>
> Spotify's OAuth callback only allows `localhost` / `127.0.0.1` for development. For a real self-hosted deployment accessible from other devices on your network, you need a proper domain or subdomain, even one that only resolves on your local network. Nginx Proxy Manager makes this easy.

For example, if you own `example.com`, you could use:

```text
spotify-tools.example.com
```

The basic setup looks like this:

```text
Browser
   ↓
spotify-tools.example.com
   ↓
DNS
   ↓
Your server
   ↓
Nginx Proxy Manager
   ↓
Spotify Tools container :3000
```

---

## Step 1 - Get Your Spotify API Credentials

You need a **Client ID** and **Client Secret** from Spotify's developer dashboard. This is free and only takes a few minutes.

1. Go to [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard) and log in with your Spotify account.

2. Click **"Create app"**.

3. Fill in the form:

   * **App name**: Anything you like (e.g. `My Spotify Tools`)
   * **App description**: Anything (e.g. `Self-hosted Spotify utilities`)
   * **Redirect URIs**:

     * With Nginx Proxy Manager / a domain:
       `https://spotify-tools.yourdomain.com/api/auth/callback`
     * Local development only:
       `http://127.0.0.1:3000/api/auth/callback`
   * **Which API/SDKs are you planning to use?**: Check **Web API**
   * Accept the terms and click **Save**.

4. On your new app's page, click **Settings** (top right area of the page).

5. Copy your **Client ID** - you'll need it in Step 3.

6. Click **"View client secret"** and copy it too.

   **Treat the Client Secret like a password - never share it or commit it to git.**

---

## Step 2 - Set Up a Callback Domain with Nginx Proxy Manager

Spotify's OAuth flow redirects your browser back to a callback URL after login. Spotify **does not allow raw IP addresses** (like `192.168.1.50`) as redirect URIs - you need a real domain name.

[Nginx Proxy Manager](https://nginxproxymanager.com/) (NPM) is an easy way to handle this on a home server. It gives you a UI to create reverse proxy entries and issue SSL certificates.

### Prerequisites for this step

* Nginx Proxy Manager already running (typically as its own Docker container)
* A domain or subdomain you control (e.g. from Cloudflare, DuckDNS, or your registrar)
* DNS configured so your chosen domain points to your server

### Configure DNS

Create a DNS record for your Spotify Tools subdomain.

For example, if you own:

```text
example.com
```

you could create:

```text
spotify-tools.example.com
```

and point it to the appropriate IP address for your setup.

If the domain is only intended to work on your local network, use your DNS server's local DNS configuration instead of making it publicly accessible.

### Create a Proxy Host in Nginx Proxy Manager

1. Open Nginx Proxy Manager's web UI (usually `http://your-server-ip:81`).

2. Go to **Hosts → Proxy Hosts** and click **"Add Proxy Host"**.

3. Fill in the **Details** tab:

   | Field                     | Value                                                               |
   | ------------------------- | ------------------------------------------------------------------- |
   | **Domain Names**          | `spotify-tools.yourdomain.com`                                      |
   | **Scheme**                | `http`                                                              |
   | **Forward Hostname / IP** | Your server's LAN IP (e.g. `192.168.1.50`) or Docker container name |
   | **Forward Port**          | `3000`                                                              |
   | **Block Common Exploits** | ✅ On                                                                |

   > If Nginx Proxy Manager and Spotify Tools are running in separate Docker Compose projects, using the container name may not work unless both containers share a Docker network. If you're unsure, use your server's LAN IP.

4. Switch to the **SSL** tab:

   * Set **SSL Certificate** to **"Request a new SSL certificate"** (Let's Encrypt - free)

   * Toggle **"Force SSL"** on

   * Toggle **"HTTP/2 Support"** on

   * Enter your email address and accept the terms

   * Click **Save**

   > **Heads up:** Let's Encrypt requires your domain to be publicly reachable for the HTTP challenge. If your domain is internal-only, you'll need a DNS challenge provider (e.g. Cloudflare) or use another certificate solution such as a self-signed certificate.

5. Go back to the Spotify developer dashboard and confirm your redirect URI is saved as:

   ```text
   https://spotify-tools.yourdomain.com/api/auth/callback
   ```

   **The redirect URI in Spotify must exactly match `SPOTIFY_REDIRECT_URI` in your `.env` file.**

---

## Step 3 - Configure Environment Variables

Create a file called `.env` in the directory where you'll run the container. Copy the template below and fill in your values.

```env
# ── Spotify Credentials (from Step 1) ──────────────────────────────────────

SPOTIFY_CLIENT_ID=your_client_id_here
SPOTIFY_CLIENT_SECRET=your_client_secret_here

# The EXACT redirect URI you saved in the Spotify dashboard
SPOTIFY_REDIRECT_URI=https://spotify-tools.yourdomain.com/api/auth/callback

# ── Optional ───────────────────────────────────────────────────────────────

# Directory inside the container where the SQLite history database is stored.
# Map this to a Docker volume or bind mount to keep data between updates.

# DATA_DIR=/data
```

> **Security:** Never commit this file to a public git repository. Add `.env` to your `.gitignore` if it isn't already there.
>
> Your `.gitignore` should include at least:
>
> ```text
> .env
> .env.local
> ```

The application's persistent data is stored under `/data` inside the container. The Docker configuration in the next step maps this directory to a persistent named volume.

---

## Step 4 - Run with Docker

Create a `docker-compose.yml` alongside your `.env` file:

```yaml
services:
  spotify-tools:
    image: drew654/spotify-tools:latest
    container_name: spotify-tools
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - spotify-tools-data:/data
    env_file:
      - .env

volumes:
  spotify-tools-data:
```

The `3000:3000` port mapping makes the app available on port `3000` of your server.

For example, without the reverse proxy, you can access it from another device on your LAN at:

```text
http://192.168.1.50:3000
```

Then start it:

```bash
docker compose up -d
```

Verify that the container is running:

```bash
docker compose ps
```

If you need to troubleshoot startup issues, view the logs with:

```bash
docker compose logs -f
```

Once the container is running and Nginx Proxy Manager is configured, you should access the app through your HTTPS domain.

---

## Step 5 - Log In and Authorize

1. Open your browser and navigate to the app:

   * Via your domain:
     `https://spotify-tools.yourdomain.com`
   * Directly from the Docker host:
     `http://localhost:3000`

2. Click **"Log in with Spotify"**.

3. Spotify will ask you to authorize the app - click **Agree**.

4. You'll be redirected back and logged in.

> For a Docker deployment using Nginx Proxy Manager, use your HTTPS domain as the normal URL. `localhost:3000` is primarily useful when accessing the Docker host directly.

---

## Updating

### With `docker-compose.yml`

To update to the latest image:

```bash
docker compose pull
docker compose up -d
```

Your history database lives in the named Docker volume (`spotify-tools-data`) and survives container restarts and image updates automatically.

> **Warning:** Do not use `docker compose down -v` unless you intentionally want to delete the `spotify-tools-data` volume and its contents.

---

## Backing Up Your Data

Your playback history is stored in the Docker volume:

```text
spotify-tools-data
```

Because this is a named Docker volume, it is separate from the container itself and will survive normal container recreation and image updates.

For important data, you should periodically back up the volume. If you're moving the application to another server, make sure to migrate the volume contents along with your Docker configuration and `.env` file.

> **Important:** Your `.env` contains your Spotify Client Secret. Keep backups of it secure and never upload it to a public repository.

---

## Troubleshooting

### The domain doesn't load

Check that:

* Your DNS record points to the correct server/IP.
* Nginx Proxy Manager is running.
* The Proxy Host is configured with the correct domain.
* The Spotify Tools container is running.
* Port `3000` is reachable from Nginx Proxy Manager.

Check the container with:

```bash
docker compose ps
```

### Nginx Proxy Manager shows `502 Bad Gateway`

This usually means Nginx Proxy Manager cannot reach the Spotify Tools container.

Check:

```bash
docker compose ps
```

and:

```bash
docker compose logs -f
```

If you're using the Docker container name as the **Forward Hostname / IP**, make sure Nginx Proxy Manager and Spotify Tools are connected to a common Docker network.

Alternatively, use the Docker host's LAN IP as the Forward Hostname / IP.

### Spotify reports a redirect URI error

Make sure these two values are **exactly identical**:

1. The Redirect URI in the Spotify Developer Dashboard
2. `SPOTIFY_REDIRECT_URI` in `.env`

For example:

```text
https://spotify-tools.example.com/api/auth/callback
```

Differences in the protocol (`http` vs `https`), hostname, port, path, or trailing characters can cause the OAuth redirect to fail.

### The history disappears after an update

Make sure your container has the `/data` volume configured:

```yaml
volumes:
  - spotify-tools-data:/data
```

You can check your existing volumes with:

```bash
docker volume ls
```

Do not remove the `spotify-tools-data` volume if you want to preserve your history.

---

## Development (Local, No Docker)

```bash
# Install dependencies
npm install

# Make sure .env.local exists with your credentials
# (copy from the template at the top of .env.local)

# Start the dev server with hot reload
npm run dev
```

Open:

```text
http://localhost:3000
```

For local dev, use:

```text
http://127.0.0.1:3000/api/auth/callback
```

as your Spotify redirect URI - Spotify allows `127.0.0.1` for development purposes.
