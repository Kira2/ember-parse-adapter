import { module, test } from "qunit";
import { setupApplicationTest } from "ember-qunit";

module( "Integration - initializer:initialize", function(hooks) {
  setupApplicationTest(hooks);
});

test( "initializer / Adapter is registered on container", function( assert ) {
  assert.equal( typeof this.owner.lookup( "adapter:-parse" ), "object" );
  assert.equal( this.owner.registeredOptions( "adapter:-parse" ).instantiate, undefined );
});

test( "initializer / Adapter has header values set to expected values", function( assert ) {
  assert.equal( this.owner.lookup( "adapter:-parse" ).headers["X-Parse-Application-Id"], "appId" );
  assert.equal( this.owner.lookup( "adapter:-parse" ).host, "http://localhost:1337" );
  assert.equal( this.owner.lookup( "adapter:-parse" ).namespace, "parse" );
});

test( "initializer / Serializer is registered on container", function( assert ) {
  assert.equal( typeof this.owner.lookup( "serializer:-parse" ), "object" );
  assert.equal( this.owner.registeredOptions( "serializer:-parse" ).instantiate, undefined );
});

test( "initializer / Parse Date transform is registered on container", function( assert ) {
  assert.equal( typeof this.owner.lookup( "transform:parse-date" ), "object" );
  assert.equal( this.owner.registeredOptions( "transform:parse-date" ).instantiate, undefined );
});

test( "initializer / Parse File transform is registered on container", function( assert ) {
  assert.equal( typeof this.owner.lookup( "transform:parse-file" ), "object" );
  assert.equal( this.owner.registeredOptions( "transform:parse-file" ).instantiate, undefined );
});

test( "initializer / Parse GeoPoint transform is registered on container", function( assert ) {
  assert.equal( typeof this.owner.lookup( "transform:parse-geo-point" ), "object" );
  assert.equal( this.owner.registeredOptions( "transform:parse-geo-point" ).instantiate, undefined );
});

test( "initializer / Parse User model is registered on container", function( assert ) {
  assert.equal( typeof this.owner.registeredOptions( "model:parse-user" ), "object" );
  assert.equal( this.owner.registeredOptions( "model:parse-user" ).instantiate, undefined );
});
