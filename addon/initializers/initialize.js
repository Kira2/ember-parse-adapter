import Adapter from "../adapters/application";
import Serializer from "../serializers/application";
import DateTransform from "../transforms/date";
import FileTransform from "../transforms/file";
import ObjectTransform from "../transforms/object";
import GeopointTransform from "../transforms/geopoint";
import ParseUser from "../models/parse-user";

/**
 * @module initializers
 * @class  initialize
 */
export default function( container, app ) {
  Adapter.reopen({
    host            : app.get( "parseUrl" ),
    namespace       : app.get( "parseNamespace" ),
    applicationId   : app.get( "applicationId" ),
    restApiId       : app.get( "restApiId" )
  });

  container.register( "adapter:-parse", Adapter );
  container.register( "serializer:-parse", Serializer );
  container.register( "transform:parse-date", DateTransform );
  container.register( "transform:parse-file", FileTransform );
  container.register( "transform:parse-object", ObjectTransform );
  container.register( "transform:parse-geo-point", GeopointTransform );
  container.register( "model:parse-user", ParseUser );
}
