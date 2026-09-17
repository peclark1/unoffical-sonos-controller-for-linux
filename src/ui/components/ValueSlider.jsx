import throttle from 'lodash/throttle';
import React, { Component } from 'react';

class VolumeSlider extends Component {
    constructor(props) {
        super(props);
        this.state = { dragging: false };

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
            (direction) => {
                this._setValue(this._getValue() + direction);
            },
            100,
            {
                leading: true,
                trailing: true,
            },
        );
    }

    componentWillUnmount() {
        this._setValueThrottled.cancel();
        this._onWheelThrottled.cancel();
    }

    _onStart(e) {
        this.setState({
            dragging: true,
            value: Number(e.target.value),
        });

        if (this.props.startHandler) {
            this.props.startHandler();
        }
    }

    _onStop() {
        this._setValueThrottled.flush();

        this.setState({
            dragging: false,
            value: null,
        });

        if (this.props.stopHandler) {
            this.props.stopHandler();
        }
    }

    _onInput(e) {
        const value = Number(e.target.value);

        this.setState({
            dragging: true,
            value,
        });

        this._setValueThrottled(value);
    }

    _setValue(value) {
        if (this.props.dragHandler) {
            this.props.dragHandler(value);
        }
    }

    _onWheel(e) {
        this._onWheelThrottled(e.deltaY > 0 ? -1 : 1);
    }

    _getValue() {
        return this.state.dragging
            ? this.state.value
            : Number(this.props.value);
    }

    render() {
        const value = this._getValue();

        return (
            <div className="value-bar">
                <input
                    type="range"
                    min="0"
                    max="100"
                    value={Number(value)}
                    onChange={() => {}}
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
