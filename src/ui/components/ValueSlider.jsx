import throttle from 'lodash/throttle';
import React, { Component } from 'react';

function volumeDebug(event, details = {}) {
    console.log(
        `[volume-debug] ${performance.now().toFixed(1)} ${event} ${JSON.stringify(details)}`,
    );
}

class VolumeSlider extends Component {
    constructor(props) {
        super(props);

        this._input = React.createRef();
        this._dragging = false;
        this._pendingValue = null;
        this._pendingTimer = null;
        this._inputCount = 0;
        this._lastInputValue = null;

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

            if (!confirmed) {
                return;
            }

            volumeDebug('slider-confirmed', {
                slider: this.props.debugName || 'volume',
                requested: this._pendingValue,
                confirmed: confirmedValue,
            });
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
        this._inputCount = 0;
        this._lastInputValue = Number(e.currentTarget.value);

        volumeDebug('pointer-down', {
            slider: this.props.debugName || 'volume',
            value: this._lastInputValue,
            pointerId: e.pointerId,
        });

        if (e.currentTarget.setPointerCapture) {
            try {
                e.currentTarget.setPointerCapture(e.pointerId);
            } catch (err) {
                // Pointer capture is only a robustness aid.
            }
        }

        if (this.props.startHandler) {
            this.props.startHandler();
        }
    }

    _onStop(e) {
        const value = Number(e.currentTarget.value);

        volumeDebug('pointer-up', {
            slider: this.props.debugName || 'volume',
            value,
            inputCount: this._inputCount,
            lastInputValue: this._lastInputValue,
            pointerId: e.pointerId,
            eventType: e.type,
        });

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

        this._pendingValue = value;
        this._clearPendingTimer();
        this._pendingTimer = window.setTimeout(() => {
            volumeDebug('slider-confirm-timeout', {
                slider: this.props.debugName || 'volume',
                requested: this._pendingValue,
                value: Number(this.props.value),
                confirmed: Number(this.props.confirmedValue),
            });
            this._pendingValue = null;

            if (this._input.current && !this._dragging) {
                this._input.current.value = Number(this.props.value);
            }
        }, 5000);

        this._dragging = false;

        volumeDebug('submit-final-volume', {
            slider: this.props.debugName || 'volume',
            value,
        });
        this._setValue(value);

        if (this.props.stopHandler) {
            this.props.stopHandler(value);
        }
    }

    _onInput(e) {
        this._dragging = true;
        this._inputCount += 1;
        this._lastInputValue = Number(e.currentTarget.value);
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
