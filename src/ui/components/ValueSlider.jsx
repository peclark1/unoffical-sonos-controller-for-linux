import throttle from 'lodash/throttle';
import React, { Component } from 'react';

class VolumeSlider extends Component {
    constructor(props) {
        super(props);

        this._input = React.createRef();
        this._dragging = false;

        this._onStart = this._onStart.bind(this);
        this._onStop = this._onStop.bind(this);
        this._onInput = this._onInput.bind(this);
        this._onWheel = this._onWheel.bind(this);

        this._setValueThrottled = throttle(
            (value) => this._setValue(value),
            100,
            {
                leading: true,
                trailing: true,
            },
        );
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
        if (
            !this._dragging &&
            prevProps.value !== this.props.value &&
            this._input.current
        ) {
            this._input.current.value = Number(this.props.value);
        }
    }

    componentWillUnmount() {
        this._setValueThrottled.cancel();
        this._onWheelThrottled.cancel();
    }

    _onStart() {
        this._dragging = true;

        if (this.props.startHandler) {
            this.props.startHandler();
        }
    }

    _onStop(e) {
        const value = Number(e.currentTarget.value);

        // Make sure the final thumb position is always sent, even if it landed
        // between throttle intervals.
        this._setValueThrottled(value);
        this._setValueThrottled.flush();
        this._dragging = false;

        if (this.props.stopHandler) {
            this.props.stopHandler();
        }
    }

    _onInput(e) {
        // Leave the range input uncontrolled while dragging. Chromium can then
        // paint the thumb directly at pointer speed while Sonos updates happen
        // independently on the throttled path below.
        this._dragging = true;
        this._setValueThrottled(Number(e.currentTarget.value));
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

        // Wheel changes do not get the browser's native range-input movement,
        // so update the DOM directly and let the Sonos command trail behind it.
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
