import Ember from "ember";
import { A } from "@ember/array";
import { merge } from "@ember/polyfills";
import { dasherize, camelize, capitalize } from "@ember/string";
import { isEmpty, isNone, typeOf } from "@ember/utils";
import DS from "ember-data";

export default DS.RESTSerializer.extend({

  // this will be removed in 2.0
  isNewSerializerAPI: true,

  primaryKey: "objectId",


  /**
  * @function normalizeArrayResponse
  * @description Overrides ember-data function.
  */
  normalizeArrayResponse: function( store, primaryType, payload ) {
    var inflector = new Ember.Inflector(Ember.Inflector.defaultRules);
    var namespacedPayload = {};

    namespacedPayload[ inflector.pluralize( primaryType.modelName ) ] = payload.results;

    // get the count metadata sent by parse-server if needed
    if ( payload.hasOwnProperty("count") ) {
      namespacedPayload.meta = { count: payload.count };
    }

    return this._super( store, primaryType, namespacedPayload );
  },


  /**
  * @function normalizeSingleResponse
  * @description Overrides ember-data function.
  */
  normalizeSingleResponse: function( store, primaryType, payload, recordId ) {
    var namespacedPayload = {};
    namespacedPayload[ primaryType.modelName ] = payload; // this.normalize(primaryType, payload);

    return this._super( store, primaryType, namespacedPayload, recordId );
  },


  /**
  * @function modelNameFromPayloadKey
  * @description Overrides ember-data function.
  */
  modelNameFromPayloadKey: function( key ) {
    var inflector = new Ember.Inflector(Ember.Inflector.defaultRules);
    return dasherize( inflector.singularize( key ) );
  },


  /**
  * @function normalizeResponse
  * @description Overrides ember-data function. Because parse-server only
  * returns the updatedAt/createdAt values on updates we have to intercept it
  * here to assure that the adapter knows which record ID we are dealing with
  * (using the primaryKey).
  */
  normalizeResponse: function( store, primaryModelClass, payload, id, requestType ) {
    if( (id !== null) && ( requestType === "updateRecord" || requestType === "deleteRecord" ) ) {
      payload[ this.get( "primaryKey" ) ] = id;
    }

    return this._super( store, primaryModelClass, payload, id, requestType );
  },


  /**
  * @function normalizeAttributes
  * @description Overrides ember-data function. Special handling for the Date
  * objects inside the properties of parse-server responses.
  */
  normalizeAttributes: function( type, hash ) {
    type.eachAttribute( function( key, meta ) {
      if ( meta.type === "date" && typeOf( hash[key] ) === "object" && hash[key].iso ) {
        hash[key] = hash[key].iso;
      }
    });

    this._super( type, hash );
  },


  /**
  * @function extractRelationship
  * @description Overrides ember-data function.
  */
  extractRelationship: function(relationshipModelName, relationshipHash) {
    if (isNone(relationshipHash)) { return null; }

    // When `relationshipHash` is an object it usually means that the relationship
    // is polymorphic. It could however also be embedded resources that the
    // EmbeddedRecordsMixin has be able to process.

    if (typeOf(relationshipHash) === "object") {
      if (relationshipHash.__type) {
        if (relationshipHash.__type === "Pointer") {
          return { id: relationshipHash.objectId, type: relationshipModelName };
        }
        else if (relationshipHash.__type === "Object") {
          // The query was made with the "include" parameter.
          // So, clean the included object and add it to the store.
          var store = this.get("store");
          var model = store.modelFor(relationshipModelName);
          var serialized = this.normalize(model, relationshipHash);
          store.push(serialized);

          return { id: relationshipHash.objectId, type: relationshipModelName };
        }
      }
      // {"__op": "Delete"} due to a previous delete operation
      else if (relationshipHash.__op) {
        return null;
      }
      return relationshipHash;
    }

    // https://github.com/emberjs/data/blob/v2.0.0/packages/ember-data/lib/system/coerce-id.js
    var coerceId = relationshipHash == null || relationshipHash === "" ? null : relationshipHash + "";

    return { id: coerceId, type: relationshipModelName };
  },


  /**
  * @function extractRelationships
  * @description Overrides ember-data function.
  */
  extractRelationships: function(modelClass, resourceHash) {
    let relationships = {};

    modelClass.eachRelationship(function(key, relationshipMeta) {
      let relationship = null;
      let relationshipKey = this.keyForRelationship(key, relationshipMeta.kind, "deserialize");

      if (resourceHash.hasOwnProperty(relationshipKey)) {
        let data = null;
        let relationshipHash = resourceHash[relationshipKey];

        if (relationshipMeta.kind === "belongsTo") {
          data = this.extractRelationship(relationshipMeta.type, relationshipHash);
          relationship = { data : data };
        }

        else if (relationshipHash && relationshipMeta.kind === "hasMany") {
          if ( relationshipMeta.options.array && relationshipHash.length ) {
            data = A(relationshipHash).map(function(item) {
              return this.extractRelationship(relationshipMeta.type, item);
            }, this);
            relationship = { data : data };
          }

          else if ( relationshipMeta.options.relation ) {
            var related = { key: relationshipKey };
            relationship = relationship || {};
            relationship.links = { related : JSON.stringify(related) }; // see adapter: findHasMany will parse it
          }
        }
      }

      if (relationship) {
        relationships[key] = relationship;
      }
    }, this);

    return relationships;
  },


  /**
  * @function serializeIntoHash
  * @description Overrides ember-data function.
  */
  serializeIntoHash: function( hash, typeClass, snapshot, options ) {
    merge( hash, this.serialize( snapshot, options ) );
  },


  /**
  * @function serializeAttribute
  * @description Overrides ember-data function.
  */
  serializeAttribute: function( snapshot, json, key, attribute ) {
    // These are parse-server or internal reserved properties and we won't send them.
    if ( "createdAt" === key ||
         "updatedAt" === key ||
         "emailVerified" === key ||
         "sessionToken" === key ||
         "_removed" === key )
    {
      delete json[key];
    }
    else {
      this._super( snapshot, json, key, attribute );
    }
  },


  /**
  * @function serializeBelongsTo
  * @description Overrides ember-data function.
  */
  serializeBelongsTo: function(snapshot, json, relationship) {
    var key         = relationship.key,
        belongsToId = snapshot.belongsTo(key, { id: true });

    // serialize the relation
    if (belongsToId) {
      json[key] = {
        "__type"    : "Pointer",
        "className" : this.parseClassName(relationship.type),
        "objectId"  : belongsToId
      };
    }
    // send a delete operation as the relation was removed
    else {
      json[key] = {"__op": "Delete"};
    }
  },


  /**
  * @function parseClassName
  * @description Overrides ember-data function.
  */
  parseClassName: function(key) {
    // handle the specific cases like for User class
    if ("parseUser" === key || "parse-user" === key) {
      return "_User";
    }
    else {
      return capitalize(camelize(key));
    }
  },


  /**
  * @function serializeHasMany
  * @description Overrides ember-data function.
  */
  serializeHasMany: function( snapshot, json, relationship ) {
    var key   = relationship.key,
      hasMany = A(snapshot.hasMany(key)),
      options = relationship.options,
      _this   = this;

    if ( hasMany && hasMany.get( "length" ) > 0 ) {
      json[key] = { "objects": [] };

      if ( options.relation ) {
        json[key].__op = "AddRelation";
      }

      if ( options.array ) {
        json[key].__op = "AddUnique";
      }

      var deleted_items = A([]);
      var _deleted = snapshot.get("_deleted");

      if (!isNone(_deleted) && !isNone(_deleted[key])) {
        deleted_items = A(_deleted[key]);
      }

      // keep only the items that are not removed
      hasMany.forEach( function( child ) {
        var item = deleted_items.findBy("objectId", child.id);

        if (isEmpty(item)) {
          json[key].objects.push({
            "__type"    : "Pointer",
            "className" : _this.parseClassName(child.type.modelName),
            "objectId"  : child.id
          });
        }
      });

      if ( !isEmpty(deleted_items) ) {
        if ( options.relation ) {
          json[key]._batch_ops = { "__op": "RemoveRelation", "objects": deleted_items };
        }

        // Note from parse-server: this is not currently possible to atomically add and remove items from an array
        // in the same save. You will have to call save in between every different kind of array operation.
        if ( options.array ) {
          json[key]._batch_ops = { "__op": "Remove", "objects": deleted_items };
        }
      }

    }
    else {
      json[key] = null;
    }
  }
});
