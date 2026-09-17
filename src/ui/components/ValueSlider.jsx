import throttle from 'lodash/throttle';
import React, { Component } from 'react';

class VolumeSlider extends Component {
    constructor(props) {
        super(props);

        this._input = React.createRef();
        this._dragging = false;
        this._pendingValue = null;
        this._pendingTimer = null;

        this._onStart = this._onStart.bind(this);
        this._onStop = this._onStop.bind(this);
        this._onInput = this._onInput.bind(this);
        this._onWheel = this._onWheel.bind(this);

        this._onWheelThrottled = throttle(
            (value) => this._setValue(value),
            100,
            {
                leading: true,
                trailing: true,
            },
        );
    }

    componentDidUpdate(prevProps) {
        if (!this._input.current || this._dragging) {
            return;
        }

        const nextValue = Number(this.props.value);

        if (this._pendingValue !== null) {
            const confirmed = Math.abs(nextValue - this._pendingValue) <= 1;

            if (!confirmed) {
                return;
            }

            this._clearPendingValue();
        }

        if (prevProps.value !== this.props.value) {
            this._input.current.value = nextValue;
        }
    }

    componentWillUnmount() {
        this._onWheelThrottled.cancel();
        this._clearPendingTimer();
    }

    _clearPendingTimer() {
        if (this._pendingTimer) {
            window.clearTimeout(this._pendingTimer);
            this._pendingTimer = null;
        }
    }

    _clearPendingValue() {
        this._pendingValue = null;
        this._clearPendingTimer();
    }

    _onStart() {
        this._clearPendingValue();
        this._dragging = true;

        if (this.props.startHandler) {
            this.props.startHandler();
        }
    }

    _onStop(e) {
        const value = Number(e.currentTarget.value);

        // Keep the released thumb exactly where the user left it until the
        // Sonos state catches up. Older Sonos events must not pull it backward.
        this._pendingValue = value;
        this._clearPendingTimer();
        this._pendingTimer = window.setTimeout(() => {
            this._pendingValue = null;

            if (this._input.current && !this._dragging) {
                this._input.current.value = Number(this.props.value);
            }
        }, 5000);

        this._dragging = false;

        // Do not send intermediate network commands while dragging. Send only
        // the final released value so there is no Sonos command backlog to
        // drain after mouse-up.
        this._setValue(value);

        if (this.props.stopHandler) {
            this.props.stopHandler(value);
        }
    }

    _onInput() {
        // Chromium owns the range thumb while dragging, so the visual control
        // follows the pointer immediately. The Sonos command is sent on release.
        this._dragging = true;
    }

    _setValue(value) {
        if (this.props.dragHandler) {
            this.props.dragHandler(value);
        }
    }

    _onWheel(e) {
        const input = this._input.current;

        if (!input) {
            return;
        }

        const direction = e.deltaY > 0 ? -1 : 1;
        const value = Math.max(
            Number(input.min),
            Math.min(Number(input.max), Number(input.value) + direction),
        );

        // Wheel changes are discrete, so keep sending them through a modest
        // throttle while updating the DOM immediately.
        input.value = value;
        this._onWheelThrottled(value);
    }

    render() {
        return (
            <div className="value-bar">
                <input
                    ref={this._input}
                    type="range"
                    min="0"
                    max="100"
                    defaultValue={Number(this.props.value)}
                    onMouseDown={this._onStart}
                    onMouseUp={this._onStop}
                    onInput={this._onInput}
                    onWheel={this._onWheel}
                />
            </div>
        );
    }
}

export default VolumeSlider;
