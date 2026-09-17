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
            const confirmedValue = Number(this.props.confirmedValue);
            const confirmed =
                Number.isFinite(confirmedValue) &&
                Math.abs(confirmedValue - this._pendingValue) <= 1;

            // The optimistic Redux value is not confirmation. Keep the thumb
            // pinned where the user released it until Sonos itself reports the
            // requested value (or the failsafe timer below expires).
            if (!confirmed) {
                return;
            }

            this._clearPendingValue();
        }

        if (
            prevProps.value !== this.props.value ||
            prevProps.confirmedValue !== this.props.confirmedValue
        ) {
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

    _onStart(e) {
        this._clearPendingValue();
        this._dragging = true;

        // A fast drag can move the pointer off the narrow range input before
        // the button is released. Capture the pointer so pointerup still comes
        // back to this slider and the final Sonos volume is always submitted.
        if (e.currentTarget.setPointerCapture) {
            try {
                e.currentTarget.setPointerCapture(e.pointerId);
            } catch (err) {
                // Pointer capture is only a robustness aid; native range
                // dragging still works if the browser rejects the capture.
            }
        }

        if (this.props.startHandler) {
            this.props.startHandler();
        }
    }

    _onStop(e) {
        const value = Number(e.currentTarget.value);

        if (
            e.currentTarget.releasePointerCapture &&
            e.currentTarget.hasPointerCapture &&
            e.currentTarget.hasPointerCapture(e.pointerId)
        ) {
            try {
                e.currentTarget.releasePointerCapture(e.pointerId);
            } catch (err) {
                // Ignore a race where the browser already released capture.
            }
        }

        // Keep the released thumb exactly where the user left it until Sonos
        // confirms the target. Older in-flight events must not pull it back.
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
        // drain after pointer-up.
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
                    onPointerDown={this._onStart}
                    onPointerUp={this._onStop}
                    onPointerCancel={this._onStop}
                    onInput={this._onInput}
                    onWheel={this._onWheel}
                />
            </div>
        );
    }
}

export default VolumeSlider;
