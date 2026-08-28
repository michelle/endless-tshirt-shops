import React, {Component} from 'react';
import './App.css';
import Checkout from './Checkout';
import Shirt from './Shirt';
import {Grid, Row, Col, PageHeader, Glyphicon} from 'react-bootstrap';

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      style: 'fitted',
      checkingOut: false,
    };
  }

  handleStyleChange = style => {
    this.setState({style});
  };
  handleCheckout = checkingOut => () => {
    this.setState({checkingOut});
  };
  render() {
    return (
      <Grid>
        <PageHeader>
          datetime.store
          <h2>
            we sell a t-shirt with the current datetime.
            {' '}
            <Glyphicon glyph="time" />
          </h2>
        </PageHeader>
        <Row>
          <Col md={7} sm={6}>
            <Shirt
              shirtStyle={this.state.style}
              disabled={this.state.checkingOut}
            />
          </Col>
          <Col md={5} sm={6}>
            <Checkout
              onCheckout={this.handleCheckout(true)}
              onComplete={this.handleCheckout(false)}
              onStyleChange={this.handleStyleChange}
            />
          </Col>
        </Row>
      </Grid>
    );
  }
}

export default App;
