import { module, test, skip } from "qunit";
import { setupApplicationTest } from "ember-qunit";
import { get } from "@ember/object";
import { isEmpty } from "@ember/utils";
import DS from "ember-data";
import deleteUser from "../../helpers/fixtures/delete-user";

var store;
var adapter;
var ParseUser;
var users;

module( "Integration - model:parse-user", function(hooks) {
  setupApplicationTest(hooks);

  hooks.beforeEach(function() {
    store = this.owner.lookup( "service:store" );
    adapter = store.adapterFor("application");
    ParseUser = store.modelFor( "parse-user" );
    users = [];
  });

  hooks.afterEach(async function() {

    for (let i = 0; i < users.length; i++) {
      var username = users[i].username;
      var password = users[i].password;

      await ParseUser.login( store, { username: username, password: password } ).then(function(user) {
        deleteUser(adapter, user.get("id"), user.get("sessionToken"));
      });
    }
  });
});


test("parse-user / All operations", async function( assert ) {
  assert.expect(18);

  // Signup
  await ParseUser.signup( store, {
    username : "clintjhill",
    password : "loveyouall",
    email    : "clint@foo.com"

  }).then( function( user ) {
    users.push({
      id: get( user, "id"),
      sessionToken: get( user, "sessionToken" ),
      username: "clintjhill",
      password: "loveyouall"
    });

    assert.ok( !get( user, "isSaving"), "user is not saving" );
    assert.ok( !get( user, "hasDirtyAttributes"), "user is not dirty" );
    assert.notOk( isEmpty( users[0].id ), "Be sure objectId is set." );
    assert.notOk( isEmpty( users[0].sessionToken ), "Make sure session token set." );
    assert.equal( get( user, "username" ), "clintjhill", "Be sure username is set." );
    assert.equal( get( user, "email" ), "clint@foo.com", "Be sure email is set." );
    // assert.equal( get( user, "password"), null, "Be sure that password gets dumped." );
  });

  // Find
  await store.findRecord( "parse-user", users[0].id ).then(function(user) {
    assert.ok( !get( user, "isCurrent" ), "User should not be current during a find." );
    assert.equal( get( user, "username" ), "clintjhill", "Be sure username is set." );
    assert.equal( get( user, "email" ), "clint@foo.com", "Be sure email is set." );
    // assert.equal( get( user, "password"), null, "Be sure that password gets dumped." );
  });

  // Login
  await ParseUser.login( store, {username: "clintjhill", password: "loveyouall"} ).then( function( user ) {
    users[0].sessionToken = get( user, "sessionToken");

    assert.equal( get( user, "username" ), "clintjhill", "Be sure username is set." );
    assert.equal( get( user, "email" ), "clint@foo.com", "Be sure email is set." );
    // assert.equal( get( user, "password" ), null, "Be sure that password gets dumped." );
  });

  // Me
  adapter.set("sessionToken", users[0].sessionToken);

  await ParseUser.me( store ).then( function( user ) {
    assert.equal( get( user, "username" ), "clintjhill", "Be sure username is set." );
    assert.equal( get( user, "email" ), "clint@foo.com", "Be sure email is set." );
    // assert.equal( get( user, "password" ), null, "Be sure that password gets dumped." );
  });

  // Logout
  await ParseUser.logout( store ).then(function() {
    ParseUser.me( store ).catch( function( error ) {
      assert.ok(error, "An error must be returned.");
      assert.equal(error.code, 209, "Session token should be invalid now.");
    });
  });

  // Update
  await ParseUser.login( store, {username: "clintjhill", password: "loveyouall"} ).then( function( user ) {

    // update allowed with the right session-token
    users[0].sessionToken = get( user, "sessionToken");
    adapter.set("sessionToken", users[0].sessionToken);

    user.set( "email", "other@foo.com" );
    assert.ok( get( user, "hasDirtyAttributes" ), "user has dirty attributes.");

    return user.save().then(function(result) {
      assert.notOk( get( result, "hasDirtyAttributes" ), "user has not dirty attributes.");
      assert.equal( get( result, "email" ), "other@foo.com", "User was updated.");
    });
  });
});


test("parse-user / Signup with bad parameters", async function(assert) {
  assert.expect(2);

  await ParseUser.signup( store, {
    username : "clintjhill",
    email    : "clint@foo.com"

  }).catch( function( error ) {
    assert.ok(error, "An error must be returned.");
    assert.equal(error.code, 201, "Password is required.");
  });
});


test("parse-user / Login with bad parameters", async function(assert) {
  assert.expect(2);

  await ParseUser.login( store, {username: "clintjhill", password: "unknown"} ).catch( function( error ) {
    assert.ok(error, "An error must be returned.");
    assert.equal(error.code, 101, "Invalid username/password.");
  });
});


test( "parse-user / Subclassing Parse User", async function( assert ) {
  assert.expect(2);

  ParseUser.reopen({
    nickname: DS.attr("string")
  });

  await ParseUser.signup( store, {
    username  : "clint",
    password  : "loveyouall",
    nickname  : "rick"

  }).then( function( user ) {
    users.push({
      id: get( user, "id"),
      sessionToken: get( user, "sessionToken"),
      username: "clint",
      password: "loveyouall"
    });

    assert.ok( get( user, "isLoaded" ) );
    assert.equal( get( user, "nickname" ), "rick", "Additional attributes are added." );
  });
});


skip("parse-user / Reset password with bad parameters", async function(assert) {
  assert.expect(2);

  await ParseUser.requestPasswordReset( store ).catch( function( error ) {
    assert.ok(error, "An error must be returned.");
    assert.equal(error.code, 204, "you must provide an email.");
  });
});


skip("parse-user / Signup with Facebook", async function( assert ) {
  assert.expect(6);

  var expirationDate = ( new Date() ).toISOString();

  await ParseUser.signup( store, {
    authData: {
      facebook: {
        access_token    : "some-fake-token",
        id              : "some-id",
        expiration_date : expirationDate
      }
    }

  }).then( function( user ) {
    users.push({
      id: get( user, "id"),
      sessionToken: get( user, "sessionToken")
    });

    assert.ok( !get( user, "isSaving" ), "user is not saving" );
    assert.ok( !get( user, "hasDirtyAttributes" ), "user is not dirty" );
    assert.notOk( isEmpty( users[0].id ), "Be sure objectId is set." );
    assert.equal( get( user, "password" ), null, "Be sure that password gets dumped." );
    assert.notOk( isEmpty( users[0].sessionToken ), "Make sure session token set." );
    assert.equal( get( user, "username" ), "foofoo-username", "Make sure username set." );
  });
});
