import React from 'react';
// import moment from 'moment';
import {Label, Glyphicon} from 'react-bootstrap';

import './Shirt.css';

export default class extends React.Component {
  static propTypes = {
    shirtStyle: React.PropTypes.oneOf(['fitted', 'unisex']).isRequired,
    disabled: React.PropTypes.bool,
  }

  componentDidMount() {
    const canvas = document.createElement('canvas');
    canvas.style.width = '30%';
    canvas.style.height = 'auto';
    const ctx = canvas.getContext('2d');
    ctx.font = "37px 'Chivo'";
    ctx.textBaseline = 'top';
    ctx.fillStyle = 'white';
    ctx.fillText(new Date().getTime() + '', 0, 0);
    document.querySelector('.Shirt-time-d').appendChild(canvas);

    const cb = () => {
      window.requestAnimationFrame(() => {
        if (!this.props.disabled) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.fillText(new Date().getTime() + '', 0, 0);
        }
        cb();
      });
    }
    cb();
  }

  renderMs() {
    const ms = new Date().getMilliseconds().toString();
    return Array(3 - ms.length + 1).join('0') + ms;
  }
  renderTime() {
    return (
      <div className="Shirt-time">
        <div className="Shirt-time-d" />
      </div>
    );
    /*
    return (
      <div className="Shirt-time">
        <div className="Shirt-time-d">
          {moment().format('ll')}
        </div>
        <div className="Shirt-time-s">
          {moment().format('HH:mm:ss')}
        </div>
        <div className="Shirt-time-ms">
          {this.renderMs()}
        </div>
      </div>
    );
    */
  }
  renderPath() {
    if (this.props.shirtStyle === 'fitted') {
      return (
        <path xmlns="http://www.w3.org/2000/svg" fillRule="evenodd" clipRule="evenodd" d="M79.312,15.149c-1.629-1.631-16.117-6.146-16.117-6.146s-4.31,8.721-11.66,8.721s-11.66-8.721-11.66-8.721   s-15.354,4.936-16.486,6.068c-1.13,1.13-13.712,16.992-13.712,16.992l10.081,8.37l6.614-5.518c0,0,14.411,23.971,1.384,58.875   c0,0,43.546,10.767,47.434,0c-9.689-43.26,1.379-58.613,1.379-58.613l6.267,5.228l9.35-11.117   C92.185,29.288,80.945,16.781,79.312,15.149z"/>
      );
    } else {
      return (
        <path xmlns="http://www.w3.org/2000/svg" fillRule="evenodd" clipRule="evenodd" d="M79.313,6.142C77.683,4.511,63.196,4,63.196,4s-9.844,13.724-11.661,13.724   C49.719,17.724,39.875,4,39.875,4S24.521,4.932,23.389,6.064c-1.13,1.13-22.827,24.89-22.827,24.89L16.71,42.975l9.662-8.06   l1.384,58.875c0,0,43.541,10.705,47.433,0l1.379-58.613l9.347,7.797L100,30.953C100,30.953,80.945,7.774,79.313,6.142z"/>
      );

    }
  }
  render() {
    return (
      <div className="Shirt">
        {this.renderTime()}
        <svg className="Shirt-svg" viewBox="0 0 100 125" width="100%">
          <g>
            {this.renderPath()}
          </g>
        </svg>
        <div className="Shirt-price">
          <h2>
            <Label bsStyle="primary"><strike>$30.00</strike> $22.50</Label>
          </h2>
        </div>
      </div>
    );
  }
}
