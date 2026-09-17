import React, { Component } from 'react';
import { connect } from 'react-redux';

import MuteButton from './MuteButton';
import ValueSlider from './ValueSlider';

const {
    setDragging,
    setExpanded,
    setGroupVolume,
    setPlayerMuted,
    setPlayerVolume,
} = window.VolumeControlActions;

const { show } = window.EqActions;

const { getPlayers, getCurrentGroupKeys, getGroupVolume, getGroupMuted } =
    window.VolumeControlSelectors;

const mapStateToProps = (state) => {
    return {
        players: getPlayers(state),
        currentGroupKeys: getCurrentGroupKeys(state),
        currentHost: state.sonosService.currentHost,
        groupVolume: getGroupVolume(state),
        groupMuted: getGroupMuted(state),
        dragging: state.volume.dragging,
        expanded: state.volume.expanded,
    };
};

const mapDispatchToProps = {
    setPlayerVolume,
    setGroupVolume,
    setPlayerMuted,
    setDragging,
    setExpanded,
    show,
};

class VolumeControls extends Component {
    constructor(props) {
        super(props);
        this.state = {};
        this._groupVolumeSnapshot = null;
    }

    _toggleGoupMute() {
        const muted = this.props.groupMuted;

        this.props.currentGroupKeys.forEach((host) => {
            this.props.setPlayerMuted(host, !muted);
        });
    }

    _captureGroupVolumeSnapshot() {
        const players = this.props.currentGroupKeys.reduce((snapshot, key) => {
            const player = this.props.players[key];

            if (player) {
                snapshot[key] = Number(player.volume);
            }

            return snapshot;
        }, {});

        this._groupVolumeSnapshot = {
            groupVolume: Number(this.props.groupVolume),
            players,
        };
    }

    _getGroupVolumeUpdates(volumeLevel) {
        const snapshot = this._groupVolumeSnapshot || {
            groupVolume: Number(this.props.groupVolume),
            players: this.props.currentGroupKeys.reduce((players, key) => {
                players[key] = Number(this.props.players[key].volume);
                return players;
            }, {}),
        };

        const groupVolume = snapshot.groupVolume;
        const deltaVolume = volumeLevel - groupVolume;

        return this.props.currentGroupKeys.reduce((volumes, key) => {
            const playerVolume = Number(snapshot.players[key] || 0);
            let newVolume;

            if (volumeLevel < 1) {
                newVolume = 0;
            } else if (groupVolume <= 0) {
                newVolume = volumeLevel;
            } else if (deltaVolume > 0) {
                newVolume = playerVolume + deltaVolume;
            } else {
                const factor = playerVolume / groupVolume;
                newVolume = Math.ceil(factor * volumeLevel);
            }

            volumes[key] = Math.max(0, Math.min(99, newVolume));
            return volumes;
        }, {});
    }

    _changeGroupVolume(volume) {
        const volumeLevel = Math.max(0, Math.min(99, Number(volume)));
        const keys = this.props.currentGroupKeys;

        if (keys.length === 1) {
            this.props.setPlayerVolume(keys[0], volumeLevel);
            return;
        }

        if (!keys.length) {
            return;
        }

        const host = this.props.currentHost || keys[0];
        const volumes = this._getGroupVolumeUpdates(volumeLevel);
        this.props.setGroupVolume(host, volumeLevel, volumes);
    }

    _startGroupVolume() {
        const keys = this.props.currentGroupKeys;
        this._captureGroupVolumeSnapshot();
        this._dragStart();
        this.props.setExpanded(keys.length > 1);
    }

    _endGroupVolume() {
        this._dragEnd();
        this._hideTimeStart();
        this._groupVolumeSnapshot = null;
    }

    _dragStart() {
        this.props.setDragging(true);
    }

    _dragEnd() {
        this.props.setDragging(false);
    }

    _hideTimeStart() {
        this._hideTimer = window.setTimeout(() => {
            this.props.setExpanded(false);
        }, 1000);
    }

    _hideTimeStop() {
        window.clearTimeout(this._hideTimer);
    }

    _openSettings() {
        this.props.show();
    }

    render() {
        let groupMuted = false;
        let groupVolume = 0;
        let playerPopover;

        const keys = this.props.currentGroupKeys;

        if (keys.length === 1) {
            groupMuted = this.props.players[keys[0]].muted;
            groupVolume = this.props.players[keys[0]].volume;
        } else {
            groupMuted = this.props.groupMuted;
            groupVolume = this.props.groupVolume;
        }

        if (this.props.expanded && keys.length > 1) {
            const playerRows = Object.keys(this.props.players).map((key) => {
                const { volume, muted, name } = this.props.players[key];

                const startVolume = () => {
                    this._dragStart();
                };

                const endVolume = () => {
                    this._dragEnd();
                };

                const changeVolume = (volume) => {
                    if (!this.props.expanded) {
                        this.props.setExpanded(true);
                    }
                    this.props.setPlayerVolume(key, volume);
                };

                const toggleMute = () => {
                    this.props.setPlayerMuted(key, !muted);
                };

                return (
                    <div key={key}>
                        <h6>{name}</h6>

                        <MuteButton muted={muted} clickHandler={toggleMute} />

                        <ValueSlider
                            value={volume}
                            stopHandler={endVolume}
                            startHandler={startVolume}
                            dragHandler={changeVolume}
                        />
                    </div>
                );
            });

            playerPopover = (
                <div
                    id="player-volumes-container"
                    onMouseOut={this._hideTimeStart.bind(this)}
                    onMouseOver={this._hideTimeStop.bind(this)}
                >
                    <div id="player-volumes">{playerRows}</div>
                </div>
            );
        }

        return (
            <div id="master-volume">
                <MuteButton
                    muted={groupMuted}
                    clickHandler={this._toggleGoupMute.bind(this)}
                />

                <ValueSlider
                    value={groupVolume}
                    stopHandler={this._endGroupVolume.bind(this)}
                    startHandler={this._startGroupVolume.bind(this)}
                    dragHandler={this._changeGroupVolume.bind(this)}
                />

                {playerPopover}

                <a
                    className="settings-button"
                    onClick={this._openSettings.bind(this)}
                >
                    <i className="material-icons settings">equalizer</i>
                </a>
            </div>
        );
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(VolumeControls);
