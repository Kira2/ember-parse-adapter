import { computed, get } from "@ember/object";
import { merge } from "@ember/polyfills";
import { capitalize, camelize } from "@ember/string";
import { isEmpty, typeOf } from "@ember/utils";
import { Promise, reject } from "rsvp";
import DS from "ember-data";

export default DS.RESTAdapter.extend({

  defaultSerializer: "-parse",
  host: "http://localhost:1337", // url of the parse-server
  namespace: "parse", // url prefix of the API

  sessionToken: computed("headers.X-Parse-Session-Token", {
    get: function get() {
      return this.get("headers.X-Parse-Session-Token");
    },
    set: function set(key, value) {
      this.set("headers.X-Parse-Session-Token", value);
      return value;
    }
  }),


  /**
  * @function init
  * @description Set the headers with the good parse-server keys
  */
  init: function() {
    this._super();
    this.set("headers", {
      "X-Parse-Application-Id" : get(this, "applicationId"),
      "X-Parse-REST-API-Key"   : get(this, "restApiId")
    });
  },


  /**
  * @function pathForType
  * @description Overrides ember-data function to build the right URLs
  * according to the resource we want to access (class, function, etc.)
  */
  pathForType: function(type) {
    if ("parseUser" === type || "parse-user" === type) {
      return "users";
    }
    else if ("requestPasswordReset" === type) {
      return "requestPasswordReset";
    }
    else if ("login" === type) {
      return "login";
    }
    else if ("logout" === type) {
      return "logout";
    }
    else if ("me" === type) {
      return "users/me";
    }
    else if ("function" === type) {
      return "functions";
    }
    else {
      return "classes/" + capitalize(camelize(type));
    }
  },


  /**
   * @function normalizeErrorResponse
   * @description Overrides ember-data function to build the error object
   * according to the parse-server error format
   */
  normalizeErrorResponse: function(status, headers, payload) {
    if (payload && typeof payload === "object" && payload.errors) {
      return payload.errors;
    }

    return [payload];
  },


  /**
  * @function createRecord
  * @description Overrides ember-data function. Because parse-server doesn't
  * return a full set of properties on the responses to updates, we want to
  * perform a merge of the response properties onto existing data so that the
  * record maintains latest data.
  */
  createRecord: function( store, type, snapshot ) {
    var serializer = store.serializerFor( type.modelName ),
      data       = {},
      adapter    = this;

    serializer.serializeIntoHash( data, type, snapshot, { includeId: true } );

    return new Promise( function( resolve, reject ) {
      adapter.ajax( adapter.buildURL( type.modelName ), "POST", { data: data } ).then(
        function( json ) {
          resolve( merge( data, json ) );
        },
        function( reason ) {
          reject( reason.errors[0] );
        }
      );
    });
  },


  /**
  * @function updateRecord
  * @description Overrides ember-data function. Because parse-server doesn't
  * return a full set of properties on the responses to updates, we want to
  * perform a merge of the response properties onto existing data so that the
  * record maintains latest data.
  */
  updateRecord: function(store, type, snapshot) {
    var serializer  = store.serializerFor( type.modelName ),
      id          = snapshot.id,
      hasBatchOps = false,
      batch_ops   = {},
      data        = {},
      adapter     = this;

    serializer.serializeIntoHash(data, type, snapshot, { includeId: true });

    // password cannot be empty
    if( !data.password && (type.modelName === "parseUser" || type.modelName === "parse-user") ) {
      delete data.password;
    }

    // username cannot be empty
    if( !data.username && (type.modelName === "parseUser" || type.modelName === "parse-user") ) {
      delete data.username;
    }

    type.eachRelationship(function( key ) {
      if ( data[key] && data[key]._batch_ops ) {
        hasBatchOps = true;
        batch_ops[key] = data[key]._batch_ops;
        delete data[key]._batch_ops;

        // see "serializeHasMany", when we keep only the objects that are not removed
        if (isEmpty(data[key].objects)) {
          data[key] = null;
        }
      }
    });

    // if needed, saves the relations first
    var batch_ops_promise = null;
    if (hasBatchOps) {
      batch_ops_promise = adapter.ajax( adapter.buildURL( type.modelName, id ), "PUT", { data: batch_ops } );
    }
    else {
      batch_ops_promise = Promise.resolve();
    }

    return new Promise( function( resolve, reject ) {
      batch_ops_promise.then(
        function() {
          adapter.ajax( adapter.buildURL( type.modelName, id ), "PUT", { data: data } ).then(
            function( json ) {
              // This is the essential bit - merge response data onto existing data.
              resolve( merge( data, json ) );
            },
            function( reason ) {
              reject( reason.errors[0] );
            }
          );
        },
        function( reason ) {
          reject( reason.errors[0] );
        }
      );
    });
  },


  /**
  * @function deleteRecord
  * @description Overrides ember-data function. Returns the good error object
  * from parse-server in case of failure.
  */
  deleteRecord: function (store, type, snapshot) {
    return this._super(store, type, snapshot)["catch"] (
      function(response) {
        return reject(response.errors[0]);
      }
    );
  },


  /**
  * @function findHasMany
  * @description Overrides ember-data function. Implementation of a hasMany that
  * provides a Relation query for parse-server objects.
  */
  findHasMany: function( store, snapshot, url, relationship ) {
    var parseClassName = capitalize( snapshot.modelName );

    var relatedInfo_ = JSON.parse( url ),
        query        = {
        where: {
          "$relatedTo": {
            "object": {
              "__type"    : "Pointer",
              "className" : parseClassName,
              "objectId"  : snapshot.id
            },
            key: relatedInfo_.key
          }
        }
    };

    // the request is to the related type and not the type for the record.
    // the query is where there is a pointer to this record.
    return this.ajax( this.buildURL( relationship.type ), "GET", { data: query } );
  },


  /**
  * @function query
  * @description Overrides ember-data function. Implementation of findQuery that
  * automatically wraps query in a JSON string.
  *
  * @example
  *     this.store.find("comment", {
  *       where: {
  *         post: {
  *             "__type":  "Pointer",
  *             "className": "Post",
  *             "objectId": post.get("id")
  *         }
  *       }
  *     });
  */
  query: function ( store, type, query ) {
    var _query = query;

    if ( _query.where && "string" !== typeOf( _query.where ) ) {
      _query.where = JSON.stringify( _query.where );
    }
    else if (( !_query.where ) && ( !_query.order ) && ( !_query.limit ) &&
             ( !_query.skip ) && ( !_query.keys ) && ( !_query.include )) {

      // example: store.query("person", { name: "Peter" })
      _query = { where: JSON.stringify(_query) };
    }

    // Pass to _super()
    return this._super( store, type, _query );
  }
});
