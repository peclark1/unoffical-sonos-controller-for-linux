# Unofficial Sonos Controller for Linux

A desktop Sonos controller for Linux built with Electron, React, and Redux.

> **Maintenance fork**
>
> This repository is a maintenance fork of Pascal Opitz's original
> [`unoffical-sonos-controller-for-linux`](https://github.com/pascalopitz/unoffical-sonos-controller-for-linux) project.
> The upstream project is deprecated and no longer maintained. This fork keeps the
> current code usable on modern Ubuntu systems and adds a small number of targeted
> packaging and maintenance improvements while preserving the original project history.

The current baseline is upstream **0.4.0-rc1**, using **Electron 31**.

![Unofficial Sonos Controller screenshot](http://pascalopitz.github.io/unoffical-sonos-controller-for-linux/screenshots/screenshot_1.png?raw=true)

## What has changed in this fork?

The initial maintenance work in this fork focuses on making the application practical
on current Ubuntu systems:

- Restored native **Debian (`.deb`) packaging** for x86-64 Ubuntu systems.
- Added `npm run dist:deb` for building the Ubuntu package directly.
- Uses the friendlier application name **Sonos Controller** in desktop menus.
- Fixed the development command so `NODE_ENV=development` is set correctly.
- Verified the Electron 31 build and packaged `.deb` on Ubuntu, including native file dialogs.

The local-music HTTP server and the old **On this Device / Set local music folder**
feature were removed upstream in 0.4.0-rc1 and are intentionally not restored here.

## Features

The application can discover and control Sonos devices on the local network, including
common tasks such as browsing available music sources, playback control, volume control,
queue management, grouping, and music-service access supported by the underlying Sonos
libraries.

This is not an official Sonos application and is not affiliated with Sonos, Inc.

## Recommended Ubuntu install: build a `.deb`

For this fork, the preferred installation method is a normal Debian package. A `.deb`
installs the application under `/opt`, creates the desktop launcher and icons, and can be
removed later through the normal Ubuntu package tools.

### 1. Clone the repository

```bash
git clone https://github.com/peclark1/unoffical-sonos-controller-for-linux.git
cd unoffical-sonos-controller-for-linux
```

### 2. Install build dependencies

A reasonably current Node.js installation is required. The project currently builds with
Node.js 20.

This project has separate build-time and application dependency trees. The following
sequence is known to work with the current codebase:

```bash
npm install --include=dev --ignore-scripts --no-audit --no-fund

cd app
npm ci --legacy-peer-deps --no-audit --no-fund
cd ..

npm rebuild electron
```

`--legacy-peer-deps` is currently needed because a few older React components declare
peer dependency ranges that predate React 18 even though the application is using React 18.

### 3. Build the application

```bash
npm run transpile:dev
```

### 4. Build the Ubuntu package

```bash
npm run dist:deb
```

The resulting package will be written to `dist/`, for example:

```text
sonos-controller-unofficial_0.4.0-rc1_amd64.deb
```

### 5. Install it

```bash
sudo apt install ./dist/*.deb
```

After installation, search for **Sonos Controller** in the Ubuntu application menu and
optionally pin it to the dock.

To remove the package later:

```bash
sudo apt remove sonos-controller-unofficial
```

## Running from source

After installing the dependencies above and transpiling the application, run:

```bash
npm run start
```

For active development, the repository also provides:

```bash
npm run develop
```

### Chromium sandbox troubleshooting

On some Ubuntu systems, a locally downloaded Electron runtime may report that
`chrome-sandbox` is not configured correctly. If that happens when running from source,
verify the error first, then the standard Chromium SUID sandbox permissions can be set with:

```bash
sudo chown root:root node_modules/electron/dist/chrome-sandbox
sudo chmod 4755 node_modules/electron/dist/chrome-sandbox
```

This is not normally required for the installed `.deb` package.

## AppImage

The upstream 0.4.0-rc1 codebase also supports AppImage packaging. The existing AppImage
configuration is retained in this fork.

To build the configured distributable targets:

```bash
npm run dist
```

For historical upstream binaries, see the
[original project's releases](https://github.com/pascalopitz/unoffical-sonos-controller-for-linux/releases).

## Firewall settings

Sonos discovery and control use the local network. If a firewall is enabled, the original
project documented the following traffic requirements:

- TCP 1400 outgoing
- TCP 4000 incoming
- UDP 1900 outgoing
- UDP 1905 incoming

The old TCP 13453 local-file-server rule is no longer required because the local music
server was removed in upstream 0.4.0-rc1.

## Troubleshooting

### The app keeps searching for my Sonos system

Device discovery uses SSDP over IPv4 and relies on multicast/UDP traffic. Check that the
firewall rules above are not blocking discovery.

If discovery still fails and you know the IP address of one Sonos device, the application
also provides **Developer -> Add IP manually**.

### Exporting settings or app state

The **Developer** menu includes options for exporting/importing settings and saving the
current application state. These files can be useful when troubleshooting.

## Development and contributions

Issues for this maintenance fork can be filed here:

https://github.com/peclark1/unoffical-sonos-controller-for-linux/issues

Small, focused fixes that keep the application useful on current Linux systems are welcome.
The original upstream repository remains available for project history and attribution.

## Project history

Pascal Opitz originally developed this application after experimenting with a Chrome app
for Sonos. As Chrome apps declined, the project moved to Electron and evolved into the
React/Redux desktop application in this repository.

The upstream project was later deprecated. Version 0.4.0-rc1 upgraded Electron and other
dependencies, removed the local music server, and switched upstream Linux publishing to
AppImage-only. This fork starts from that version and restores practical Ubuntu `.deb`
packaging.

## Thanks to other projects

From the original project:

- The project originally ported substantial functionality from
  [bencevans/node-sonos](https://github.com/bencevans/node-sonos/) and later switched to
  using node-sonos directly.
- The web-interface markup and CSS were adapted from
  [jishi/node-sonos-web-controller](https://github.com/jishi/node-sonos-web-controller/).
- [SoCo](https://github.com/SoCo) provided useful references for Sonos behavior and special cases.
- [gotwalt/sonos](https://github.com/gotwalt/sonos) provided useful implementation notes.
- [svrooij/node-sonos-ts](https://github.com/svrooij/node-sonos-ts) demonstrates an interesting
  XML-service-definition approach.

Please refer to those projects' licenses where applicable.

## License and attribution

This fork preserves the original repository history, authorship, contributor information,
and license. See [`LICENSE.md`](LICENSE.md) for the project license.
