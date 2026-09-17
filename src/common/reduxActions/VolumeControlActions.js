import { createAction } from 'redux-actions';
import Constants from '../constants';

import SonosService from '../services/SonosService';

const playerVolumeStates = new Map();
const groupVolumeStates = new Map();

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
    }
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
        };
        playerVolumeStates.set(host, state);
    } else {
        state.sonos = sonos;
    }

    state.pending = volume;
    drainPlayerVolume(host, state);
}

function createGroupVolumeState(host) {
    const sonos = SonosService.getDeviceByHost(host);

    if (!sonos) {
        return null;
    }

    const service = sonos.groupRenderingControlService();

    return {
        service,
        sending: false,
        pending: null,
        ready: service.SnapshotGroupVolume().catch((err) => {
            console.error(err);
        }),
    };
}

function snapshotGroupVolume(host) {
    const state = createGroupVolumeState(host);

    if (state) {
        groupVolumeStates.set(host, state);
    }
}

async function drainGroupVolume(host, state) {
    if (state.sending) {
        return;
    }

    state.sending = true;
    await state.ready;

    while (state.pending !== null) {
        const volume = state.pending;
        state.pending = null;

        try {
            await state.service.SetGroupVolume(volume);
        } catch (err) {
            console.error(err);
        }
    }

    state.sending = false;

    if (state.pending !== null) {
        drainGroupVolume(host, state);
    }
}

function queueGroupVolume(host, volume) {
    let state = groupVolumeStates.get(host);

    if (!state) {
        state = createGroupVolumeState(host);

        if (!state) {
            return;
        }

        groupVolumeStates.set(host, state);
    }

    state.pending = volume;
    drainGroupVolume(host, state);
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

export const snapshotCurrentGroupVolume = createAction(
    Constants.VOLUME_CONTROLS_GROUP_VOLUME_SNAPSHOT,
    (host) => {
        snapshotGroupVolume(host);
        return { host };
    },
);

export const setGroupVolume = createAction(
    Constants.VOLUME_CONTROLS_GROUP_VOLUME_SET,
    (host, volume, volumes) => {
        const numericVolume = Number(volume);
        queueGroupVolume(host, numericVolume);

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
