import { module, test } from "qunit";
import { setupTest } from "ember-qunit";
import { isEmpty } from "@ember/utils";
import { run } from "@ember/runloop";
import ObjectTransform from "ember-parse-adapter/transforms/object";

var transform;

module( "Unit - transforms:object", function(hooks) {
  setupTest(hooks);

  hooks.beforeEach(function() {
    transform = ObjectTransform.create();
  });

  hooks.afterEach(function() {
    run( transform, "destroy" );
  });
});

test( "Serializes", function( assert ) {
  var object = {
    property1: "Lorem ipsum Byuff",
    property2: 2404,
    property3: [23, 12]
  };
  var result = transform.serialize( object );

  assert.notOk( isEmpty(result), "get an object" );
  assert.equal( result.property1, "Lorem ipsum Byuff", "property1 is correct" );
  assert.equal( result.property2, 2404, "property2 is correct" );
  assert.deepEqual( result.property3, [23, 12], "property3 is correct" );
});

test( "Serializes undefined to empty", function( assert ) {
  var result = transform.serialize( );
  assert.deepEqual( result, {}, "Serialization of undefined is empty" );
});

test( "Serializes null to empty", function( assert ) {
  var result = transform.serialize( null );
  assert.deepEqual( result, {}, "Serialization of null is empty" );
});

test( "Serializes empty to empty", function( assert ) {
  var result = transform.serialize( {} );
  assert.deepEqual( result, {}, "Serialization of empty is empty" );
});

test( "Deserializes the object" , function( assert ) {
  var object = {
    property1: "Lorem ipsum Byuff",
    property2: 2404,
    property3: [23, 12]
  };
  var result = transform.deserialize( object );

  assert.notOk( isEmpty(result), "get an object" );
  assert.equal( result.property1, "Lorem ipsum Byuff", "property1 is correct" );
  assert.equal( result.property2, 2404, "property2 is correct" );
  assert.deepEqual( result.property3, [23, 12], "property3 is correct" );
});

test( "Deserializes undefined to null", function( assert ) {
  var result = transform.deserialize(  );
  assert.deepEqual( result, {}, "Deserialization of undefined is empty" );
});

test( "Deserializes null to null", function( assert ) {
  var result = transform.deserialize( null );
  assert.deepEqual( result, {}, "Deserialization of null is empty" );
});

test( "Deserializes empty to null", function( assert ) {
  var result = transform.deserialize( {} );
  assert.deepEqual( result, {}, "Deserialization of empty is empty" );
});
