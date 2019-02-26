import { module, test } from "qunit";
import { setupApplicationTest } from "ember-qunit";
import { run } from "@ember/runloop";

var App;

module( "Integration - initializer:initialize", {
  beforeEach: function() {
    App = startApp({
      parseUrl: "http://localhost:1337",
      parseNamespace: "parse",
      applicationId: "6ZNbAMXjYcg8BLakQ8AVyFWyfA6cTWwPwLb2Gzii",
      restApiId: "E2gCZw7WFgz3jfXhxjz9YnconZrbkTDgCUpLFQqy"
    });
  }
});

test( "Adapter is registered on container", function( assert ) {
  assert.equal( typeof App.__container__.lookup( "adapter:-parse" ), "object" );
  assert.equal( App.registry._options["adapter:-parse"].instantiate, undefined );
});

test( "Adapter has header values set to expected values", function( assert ) {
  assert.equal( App.__container__.lookup( "adapter:-parse" ).headers["X-Parse-Application-Id"], "6ZNbAMXjYcg8BLakQ8AVyFWyfA6cTWwPwLb2Gzii" );
  assert.equal( App.__container__.lookup( "adapter:-parse" ).headers["X-Parse-REST-API-Key"], "E2gCZw7WFgz3jfXhxjz9YnconZrbkTDgCUpLFQqy" );
  assert.equal( App.__container__.lookup( "adapter:-parse" ).host, "http://localhost:1337" );
  assert.equal( App.__container__.lookup( "adapter:-parse" ).namespace, "parse" );
});

test( "Serializer is registered on container", function( assert ) {
  assert.equal( typeof App.__container__.lookup( "serializer:-parse" ), "object" );
  assert.equal( App.registry._options["serializer:-parse"].instantiate, undefined );
});

test( "Parse Date transform is registered on container", function( assert ) {
  assert.equal( typeof App.__container__.lookup( "transform:parse-date" ), "object" );
  assert.equal( App.registry._options["transform:parse-date"].instantiate, undefined );
});

test( "Parse File transform is registered on container", function( assert ) {
  assert.equal( typeof App.__container__.lookup( "transform:parse-file" ), "object" );
  assert.equal( App.registry._options["transform:parse-file"].instantiate, undefined );
});

test( "Parse GeoPoint transform is registered on container", function( assert ) {
  assert.equal( typeof App.__container__.lookup( "transform:parse-geo-point" ), "object" );
  assert.equal( App.registry._options["transform:parse-geo-point"].instantiate, undefined );
});

test( "Parse User model is registered on container", function( assert ) {
  assert.equal( typeof App.registry._options["model:parse-user"], "object" );
  assert.equal( App.registry._options["model:parse-user"].instantiate, undefined );
});
