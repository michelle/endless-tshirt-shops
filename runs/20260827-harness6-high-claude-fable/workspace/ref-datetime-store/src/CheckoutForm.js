import React from 'react';
import {
  label,
  HelpBlock,
  ControlLabel,
  Radio,
  Button,
  Glyphicon,
  ListGroup,
  ListGroupItem,
} from 'react-bootstrap';

export default class extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      name: '',
      address1: '',
      address2: '',
      state: '',
      city: '',
      zip: '',
      email: '',
    };
  }
  componentDidMount() {
    this.props.cardElement.mount('.Stripe');
  }
  componentWillUnmount() {
    this.props.cardElement.unmount('.Stripe');
  }
  handleSubmit = ev => {
    ev.preventDefault();
    const {name, city, state, address1, address2, zip, email} = this.state;
    this.props.onSubmit({
      email,
      address: {
        name,
        city,
        state,
        address1,
        address2,
        zip,
      },
    });
  };

  handleChange = name => e => {
    this.setState({[name]: e.target.value});
  };
  render() {
    const {disabled, error, orderErrors} = this.props;
    return (
      <form className="App-form" onSubmit={this.handleSubmit}>
        {orderErrors.length
          ? <ListGroup>
              {orderErrors.map(error => {
                return (
                  <ListGroupItem bsStyle="danger">
                    {error && error.message}
                  </ListGroupItem>
                );
              })}
            </ListGroup>
          : ''}
        <label>
          <input
            className={`field ${this.state.name ? '' : 'is-empty'}`}
            type="text"
            name="name"
            autoComplete="name"
            value={this.state.name}
            placeholder="Jenny Rosen"
            onChange={this.handleChange('name')}
            required
          />
          <span><span>Name</span></span>
        </label>
        <label>
          <input
            className={`field ${this.state.address1 ? '' : 'is-empty'}`}
            type="text"
            name="address1"
            value={this.state.address1}
            placeholder="185 Berry St"
            onChange={this.handleChange('address1')}
            required
          />
          <span><span>Shipping address</span></span>
        </label>
        <label>
          <input
            className={`field ${this.state.address2 ? '' : 'is-empty'}`}
            type="text"
            name="address2"
            value={this.state.address2}
            placeholder="Suite 550"
            onChange={this.handleChange('address2')}
          />
          <span><span>Apartment or Suite (optional)</span></span>
        </label>
        <label>
          <input
            className={`field ${this.state.city ? '' : 'is-empty'}`}
            type="text"
            name="city"
            value={this.state.city}
            placeholder="San Francisco"
            onChange={this.handleChange('city')}
            required
          />
          <span><span>City</span></span>
        </label>
        <label>
          <input
            className={`field ${this.state.state ? '' : 'is-empty'}`}
            type="text"
            name="state"
            value={this.state.state}
            placeholder="CA"
            onChange={this.handleChange('state')}
            required
          />
          <span><span>State</span></span>
        </label>
        <label>
          <input
            className={`field ${this.state.zip ? '' : 'is-empty'}`}
            type="text"
            name="zip"
            value={this.state.zip}
            placeholder="94107"
            onChange={this.handleChange('zip')}
            required
          />
          <span><span>Postal code</span></span>
        </label>
        <label>
          <input
            className={`field ${this.state.email ? '' : 'is-empty'}`}
            type="email"
            name="email"
            value={this.state.email}
            placeholder="michelle@stripe.com"
            onChange={this.handleChange('email')}
            required
          />
          <span><span>Email (for receipt)</span></span>
        </label>
        <label style={{display: 'block'}}>
          <div className="Stripe field" id="card" />
          <span><span>{error ? error.message : 'Card details'}</span></span>
        </label>
        <button type="submit" disabled={disabled}>
          <Glyphicon
            glyph={disabled ? 'refresh' : 'shopping-cart'}
            bsClass={disabled ? 'spinning glyphicon' : 'glyphicon'}
          />
          {' '}
          {disabled ? 'Processing...' : 'Buy now'}
        </button>
      </form>
    );
  }
}
