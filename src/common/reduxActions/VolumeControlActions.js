import { createAction } from 'redux-actions';
import Constants from '../constants';

import SonosService from '../services/SonosService';

const playerVolumeStates = new Map();
const RECONCILE_DELAY = 250;

function volumeDebug(event, details = {}) {
    console.log(
        `[volume-debug] ${performance.now().toFixed(1)} ${event} ${JSON.stringify(details)}`,
    );
}

function reconcilePlayerVolume(host) {
    const sonos = SonosService.getDeviceByHost(host);

    if (!sonos) {
        return;
    }

    volumeDebug('reconcile-start', { host });
    SonosService.queryVolumeInfo(sonos)
        .then(() => volumeDebug('reconcile-complete', { host }))
        .catch((err) => {
            console.error(err);
        });
}

function reconcileGroupVolumes(hosts) {
    hosts.forEach((host) => reconcilePlayerVolume(host));
}

function schedulePlayerReconcile(host, state) {
    if (state.reconcileTimer) {
        clearTimeout(state.reconcileTimer);
    }

    state.reconcileTimer = setTimeout(() => {
        state.reconcileTimer = null;

        if (!state.sending && state.pending === null) {
            reconcilePlayerVolume(host);
        }
    }, RECONCILE_DELAY);
}

async function drainPlayerVolume(host, state) {
    if (state.sending) {
        return;
    }

    state.sending = true;

    while (state.pending !== null) {
        const volume = state.pending;
        state.pending = null;
        const started = performance.now();

        volumeDebug('set-volume-start', { host, volume });
        try {
            await state.sonos.setVolume(volume);
            volumeDebug('set-volume-complete', {
                host,
                volume,
                elapsedMs: Math.round(performance.now() - started),
            });
        } catch (err) {
            console.error(err);
        }
    }

    state.sending = false;

    if (state.pending !== null) {
        drainPlayerVolume(host, state);
        return;
    }

    schedulePlayerReconcile(host, state);
}

function queuePlayerVolume(host, volume) {
    const sonos = SonosService.getDeviceByHost(host);

    if (!sonos) {
        return;
    }

    let state = playerVolumeStates.get(host);

    if (!state) {
        state = {
            sonos,
            sending: false,
            pending: null,
            reconcileTimer: null,
        };
        playerVolumeStates.set(host, state);
    } else {
        state.sonos = sonos;
    }

    if (state.reconcileTimer) {
        clearTimeout(state.reconcileTimer);
        state.reconcileTimer = null;
    }

    volumeDebug('queue-player-volume', { host, volume });
    state.pending = volume;
    drainPlayerVolume(host, state);
}

async function sendGroupVolumes(volumes) {
    const entries = Object.entries(volumes || {});

    volumeDebug('group-command-start', { volumes });
    await Promise.all(
        entries.map(async ([host, volume]) => {
            const sonos = SonosService.getDeviceByHost(host);

            if (!sonos) {
                return;
            }

            const started = performance.now();
            volumeDebug('set-volume-start', { host, volume: Number(volume) });
            try {
                await sonos.setVolume(Number(volume));
                volumeDebug('set-volume-complete', {
                    host,
                    volume: Number(volume),
                    elapsedMs: Math.round(performance.now() - started),
                });
            } catch (err) {
                console.error(err);
            }
        }),
    );

    volumeDebug('group-command-complete', {
        hosts: entries.map(([host]) => host),
    });

    const hosts = entries.map(([host]) => host);
    setTimeout(() => reconcileGroupVolumes(hosts), RECONCILE_DELAY);
}

export const setPlayerMuted = createAction(
    Constants.VOLUME_CONTROLS_MUTE_SET,
    async (host, muted) => {
        const sonos = SonosService.getDeviceByHost(host);
        await sonos.setMuted(muted);
        return {
            host,
            muted,
        };
    },
);

export const setPlayerVolume = createAction(
    Constants.VOLUME_CONTROLS_VOLUME_SET,
    (host, volume) => {
        const numericVolume = Number(volume);
        volumeDebug('action-player-volume', { host, volume: numericVolume });
        queuePlayerVolume(host, numericVolume);

        return {
            host,
            volume: numericVolume,
        };
    },
);

export const setGroupVolume = createAction(
    Constants.VOLUME_CONTROLS_GROUP_VOLUME_SET,
    (host, volume, volumes) => {
        const numericVolume = Number(volume);

        volumeDebug('action-group-volume', {
            host,
            volume: numericVolume,
            volumes,
        });
        sendGroupVolumes(volumes).catch((err) => {
            console.error(err);
        });

        return {
            host,
            volume: numericVolume,
            volumes,
        };
    },
);

export const setDragging = createAction(Constants.VOLUME_CONTROLS_DRAGGING);

export const setExpanded = createAction(Constants.VOLUME_CONTROLS_EXPANDED);

export const queryVolumes = createAction(
    Constants.VOLUME_CONTROLS_QUERY_VOLUMES,
    async () => {},
);
