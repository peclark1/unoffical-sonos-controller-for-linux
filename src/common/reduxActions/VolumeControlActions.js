import { createAction } from 'redux-actions';
import Constants from '../constants';

import SonosService from '../services/SonosService';

const playerVolumeStates = new Map();
const RECONCILE_DELAY = 250;

function reconcilePlayerVolume(host) {
    const sonos = SonosService.getDeviceByHost(host);

    if (!sonos) {
        return;
    }

    SonosService.queryVolumeInfo(sonos).catch((err) => {
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

        try {
            await state.sonos.setVolume(volume);
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

    state.pending = volume;
    drainPlayerVolume(host, state);
}

async function sendGroupVolumes(volumes) {
    const entries = Object.entries(volumes || {});

    await Promise.all(
        entries.map(async ([host, volume]) => {
            const sonos = SonosService.getDeviceByHost(host);

            if (!sonos) {
                return;
            }

            try {
                await sonos.setVolume(Number(volume));
            } catch (err) {
                console.error(err);
            }
        }),
    );

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

        // The UI sends group volume only when the drag is released. Apply the
        // final per-speaker values concurrently so release costs one network
        // round-trip instead of SnapshotGroupVolume + queued SetGroupVolume calls.
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
