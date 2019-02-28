/**
* @description Allow model classes to correctly handle relations remove operations
* @see serializer::serializeHasMany and serializer::serializeAttribute
*/
import Mixin from "@ember/object/mixin";
import { A } from "@ember/array";
import { capitalize, camelize } from "@ember/string";
import { isNone } from "@ember/utils";

export default Mixin.create({
  _deleted: {}, // contains the pointers of each object to remove for each relation: eg { "relationship1_key": [],  "relationship2_key": [], etc. }

  /**
  * @function addToRelation
  * @description Add the given object to the given relation
  * @param {string} key The name of the relation
  * @param {object} model The model to add to the relation
  */
  addToRelation (key, model) {
    if (key && model) {
      this.get(key).pushObject(model);

      // if the added object was previsouly removed, remove it from the list of the items to delete from the relation
      var deleted = this.get("_deleted");
      var deleted_items = A(deleted[key]) || A([]);

      var items = deleted_items.filterBy("objectId", model.id);
      deleted_items.removeObjects(items);
    }
  },


  /**
  * @function removeFromRelation
  * @description Removed the given object from the given relation
  * @param {string} key The name of the relation
  * @param {object} model The model to remove from the relation
  */
  removeFromRelation (key, model) {
    if (key && model) {
      var deleted = this.get("_deleted");
      var className = capitalize(camelize(model.constructor.typeKey));

      deleted[key] = deleted[key] || [];

      deleted[key].push({
        "__type"    : "Pointer",
        "className" : className,
        "objectId"  : model.id
      });
    }
  },


  /**
  * @function didUpdate
  * @description Definitely remove the deleted models from their relations
  */
  didUpdate: function() {
    var deleted = this.get("_deleted");

    for (var key in deleted) {
      var relation = this.get(key);
      var deleted_items = A(deleted[key]);

      if (!isNone(relation)) {
        for (var i = 0; i < deleted_items.length; i++) {
          var item = relation.findBy("id", deleted_items[i].objectId);
          relation.removeObject(item);
        }
      }

      deleted[key] = [];
    }
  }
});
