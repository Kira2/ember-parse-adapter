import { module, test } from "qunit";
import { setupTest } from "ember-qunit";
import { isEmpty } from "@ember/utils";
import { run } from "@ember/runloop";
import DS from "ember-data";
import FileTransform from "ember-parse-adapter/transforms/file";
import File from "ember-parse-adapter/file";

var transform;

module( "Unit - transforms:file", function(hooks) {
  setupTest(hooks);

  hooks.beforeEach(function() {
    transform = FileTransform.create();
  });

  hooks.afterEach(function() {
    run( transform, "destroy" );
  });
});

test( "Serializes", function( assert ) {
  var file = File.create({
    name : "car",
    url  : "http://example.com/car.png"
  });
  var result = transform.serialize( file );

  assert.notOk( isEmpty(result), "get an object" );
  assert.equal( result.name, file.get( "name" ), "name is preserved" );
  assert.equal( result.url, file.get( "url" ), "url is preserved" );
  assert.equal( result.__type, "File", "has the proper type" );
});

test( "Serializes null to null", function( assert ) {
  var result = transform.serialize( null );
  assert.ok( isEmpty(result), "Serialization of null is null" );
});

test( "Deserializes", function( assert ) {
  var file = {
    name   : "Plane",
    url    : "http://example.com/plane.png",
    __type : "File"
  };
  var result = transform.deserialize( file );

  assert.notOk( isEmpty(result), "get an object" );
  assert.ok( result instanceof DS.Transform, "is a DS.Transform" );
  assert.equal( result.get( "name" ), file.name, "name is preserved" );
  assert.equal( result.get( "url" ), file.url, "url is preserved" );
});

test( "Deserializes null to null", function( assert ) {
  var result = transform.deserialize( null );
  assert.ok( isEmpty(result), "Deserialization of null is null" );
});
