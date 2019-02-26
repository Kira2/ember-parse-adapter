import { isBlank } from "@ember/utils";
import DS from "ember-data";

/*
 * The object transform handles javascript JSON object format. For
 * example a Parse object might come back from the REST API
 * looking like this:
 *
 * "properties": {
 *   "property1": "Lorem ipsum Byuff",
 *   "property2": 2404,
 *   "property3": [23, 12]
 * }
 *
 * This helper deserializes that structure into a normal
 * JavaScript object. It also performs the inverse:
 * converting an object back into javascript JSON object.
 *
 * @class DS.Transforms.Data
 */
export default DS.Transform.extend({

  /**
  * @function deserialize
  */
  deserialize: function(serialized) {
    return isBlank(serialized) ? {} : serialized;
  },


  /**
  * @function serialize
  */
  serialize: function(deserialized) {
    return isBlank(deserialized) ? {} : deserialized;
  }
});
