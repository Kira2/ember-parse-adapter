import { merge } from "@ember/polyfills";
import { isEmpty } from "@ember/utils";
import { reject } from "rsvp";
import DS from "ember-data";

/****************************************************************************
/* PROPERTIES
/***************************************************************************/

/**
 * Parse User
 * @type {DS.ParseModel}
 */
var ParseUser = DS.Model.extend({
  username      : DS.attr("string"),
  password      : DS.attr("string"),
  email         : DS.attr("string"),
  emailVerified : DS.attr("boolean"),
  sessionToken  : DS.attr("string"),
  createdAt     : DS.attr("date"),
  updatedAt     : DS.attr("date")
});

/****************************************************************************
/* ACTIONS
/***************************************************************************/

ParseUser.reopenClass({
  /**
  * @function requestPasswordReset
  * @description Requesting A Password Reset
  */
  requestPasswordReset: function(store, email) {
    var adapter = store.adapterFor("parse-user"),
        data    = {email: email};

    return adapter.ajax(adapter.buildURL("requestPasswordReset"), "POST", {data:data} )["catch"] (
      function(response) {
        return reject(response.errors[0]);
      }
    );
  },


  /**
  * @function login
  * @description Logging In
  */
  login: function(store, data) {
    var model      = this,
        adapter    = store.adapterFor("parse-user"),
        serializer = store.serializerFor("parse-user");

    if (isEmpty(this.modelName)) {
      throw new Error("Parse login must be called on a model fetched via store.modelFor");
    }

    return adapter.ajax(adapter.buildURL("login"), "GET", {data: data}).then(
      function(response) {
        var serialized = serializer.normalize(model, response),
            record = store.push(serialized);
        return record;
      },
      function(response) {
        return reject(response.errors[0]);
      }
    );
  },


  /**
  * @function logout
  * @description Logging Out
  */
  logout: function(store) {
    var adapter = store.adapterFor("parse-user");

    return adapter.ajax(adapter.buildURL("logout"), "POST")["catch"] (
      function(response) {
        return reject(response.errors[0]);
      }
    );
  },


  /**
  * @function me
  * @description Retrieving Current User
  */
  me: function(store) {
    var model      = this,
        adapter    = store.adapterFor("parse-user"),
        serializer = store.serializerFor("parse-user");

    if(isEmpty(this.modelName)) {
      throw new Error("Parse me must be called on a model fetched via store.modelFor");
    }

    return adapter.ajax(adapter.buildURL("me"), "GET").then(
      function(response) {
        var serialized = serializer.normalize(model, response),
            record = store.push(serialized);
        return record;
    },
      function(response) {
        return reject(response.errors[0]);
      }
    );
  },


  /**
  * @function signup
  * @description Signing Up
  */
  signup: function(store, data) {
    var model      = this,
        adapter    = store.adapterFor("parse-user"),
        serializer = store.serializerFor("parse-user");

    if (isEmpty(this.modelName)) {
      throw new Error("Parse signup must be called on a model fetched via store.modelFor");
    }

    return adapter.ajax(adapter.buildURL(model.modelName), "POST", {data: data}).then(
      function(response) {

        var serialized = serializer.normalize(model, response);
        // This is the essential bit - merge response data onto existing data.
        merge(serialized.data.attributes, data);
        var record = store.push(serialized);

        return record;
      },
      function(response) {
        return reject(response.errors[0]);
      }
    );
  }
});

export default ParseUser;
