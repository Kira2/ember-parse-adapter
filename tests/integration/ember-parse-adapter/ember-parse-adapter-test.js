import { module, test } from "qunit";
import { setupApplicationTest } from "ember-qunit";
import { A } from "@ember/array";
import { isNone } from "@ember/utils";
import { run } from "@ember/runloop";
import { all } from "rsvp";
import DS from "ember-data";
import deleteData from "../../helpers/fixtures/delete-data";
import getData from "../../helpers/fixtures/get-data";
import File from "ember-parse-adapter/file";
import ParseRelationMixin from "ember-parse-adapter/mixins/parse-relation-mixin";

var store;
var adapter;
var authorIds;
var postIds;
var commentIds;

module( "Integration - ember-parse-adapter", function(hooks) {
  setupApplicationTest(hooks);

  hooks.beforeEach(function() {
    store = this.owner.lookup( "service:store" );
    adapter = store.adapterFor("application");

    this.owner.register( "model:author", DS.Model.extend(ParseRelationMixin, {
      position        : DS.attr( "number"),
      firstName       : DS.attr( "string"),
      lastName        : DS.attr( "string"),
      address         : DS.attr( "parse-object"),
      updateMe        : DS.attr( "boolean", { defaultValue: false } ), // used to test merge operations of the adapter
      saveMeError     : DS.attr( "number", { defaultValue: 0 } ), // used to test error on operations on the adapter
      deleteMeError   : DS.attr( "number", { defaultValue: 0 } ), // used to test error on operations on the adapter
      unreadComments  : DS.hasMany( "comment", { relation: false, array: true, async: true } )
    }));

    this.owner.register( "model:post", DS.Model.extend(ParseRelationMixin, {
      position  : DS.attr( "number"),
      title     : DS.attr( "string" ),
      date      : DS.attr( "parse-date" ),
      image     : DS.attr( "parse-file" ),
      author    : DS.belongsTo( "author", {async: true} ),
      comments  : DS.hasMany( "comment", { relation: true, array: false, async: true } )
    }));

    this.owner.register( "model:comment", DS.Model.extend({
      position  : DS.attr( "number"),
      content   : DS.attr( "string"),
      _removed  : DS.attr( "boolean", { defaultValue: false } )
    }));

    authorIds = [];
    postIds = [];
    commentIds = [];
  }),

  hooks.afterEach(function() {
    for (let i = 0; i < authorIds.length; i++) {
      deleteData(adapter, "Author", authorIds[i]);
    }

    for (let i = 0; i < postIds.length; i++) {
      deleteData(adapter, "Post", postIds[i]);
    }

    for (let i = 0; i < commentIds.length; i++) {
      deleteData(adapter, "Comment", commentIds[i]);
    }
  })
});

/**********************************************************************

 author1:
  - post1_author1
    - comment1_post1
    - comment2_post1 (unread)
  - post2_author1

 author2
  - post3_author2
    - comment3_post3 (unread)
  - post4_author2
  - post5_author2
    - comment4_post5
    - comment5_post5
    - comment6_post5 (unread)

 **********************************************************************/

var author1, author2;
var post1_author1, post2_author1, post3_author2, post4_author2, post5_author2;
var comment1_post1, comment2_post1, comment3_post3, comment4_post5, comment5_post5, comment6_post5;

var authors_data = [
  { position: 0, firstName: "John", lastName: "Doe", address: { street: "Oakdale", number: 1690, city: "San Francisco", point: [40.761890, -74.244426] } },
  { position: 1, firstName: "William", lastName: "Johnson", address: { street: "Hillside", number: 420, city: "New York", point: [37.735513, -122.391997] } }
];

var posts_data = [
  { position: 0, title: "Goodbye Parse.com", date: "2016-01-28T00:00:00.000Z", image: "somewhere.jpg" },
  { position: 1, title: "Forum rules", date: "2016-02-04T00:00:00.000Z", image: "over.jpg" },
  { position: 2, title: "How to use Ember", date: "2016-02-05T00:00:00.000Z", image: "the.jpg" },
  { position: 3, title: "Ember Data releases", date: "2016-02-29T00:00:00.000Z", image: "rainbow.jpg" },
  { position: 4, title: "Deploy MongoDB on AWS", date: "2016-03-09T00:00:00.000Z", image: "WayUpHigh.jpg" }
];

var comments_data = [
  { position: 0, content: "Lörém îpsùm dolor sit àmèt, consectetur adipiscing elit.\nQuisque elementum purus sapien." },
  { position: 1, content: "Fusce eget diam erat." },
  { position: 2, content: "Nam malesuada magna lacus, at placerat libero viverra at." },
  { position: 3, content: "Donec eu ante ultrices, accumsan erat vitae, dictum turpis." },
  { position: 4, content: "Etiam at gravida nibh. Vivamus sed volutpat augue.\nNullam blandit eget justo sed tincidunt." },
  { position: 5, content: "In fermentum vehicula odio at pharetra." }
];

var createAuthor = function(position) {
  return store.createRecord("author", {
    position: position,
    firstName: authors_data[position].firstName,
    lastName: authors_data[position].lastName,
    address: authors_data[position].address
  });
};

var createPost = function(position, author) {
  var imageFile = File.create({
    name: posts_data[position].image,
    url: "http://localhost:1337/parse/files/appId/" + posts_data[position].image
  });

  return store.createRecord("post", {
    position: position,
    title: posts_data[position].title,
    date: new Date(posts_data[position].date),
    image: imageFile,
    author: author
  });
};

var createComment = function(position) {
  return store.createRecord("comment", {
    position: position,
    content: comments_data[position].content
  });
};

var insertData = async function() {
  author1 = createAuthor(0);
  author2 = createAuthor(1);

  post1_author1 = createPost(0, author1);
  post2_author1 = createPost(1, author1);
  post3_author2 = createPost(2, author2);
  post4_author2 = createPost(3, author2);
  post5_author2 = createPost(4, author2);

  comment1_post1 = createComment(0);
  comment2_post1 = createComment(1);
  comment3_post3 = createComment(2);
  comment4_post5 = createComment(3);
  comment5_post5 = createComment(4);
  comment6_post5 = createComment(5);

  var save_comments = [];
  save_comments.push(comment1_post1.save());
  save_comments.push(comment2_post1.save());
  save_comments.push(comment3_post3.save());
  save_comments.push(comment4_post5.save());
  save_comments.push(comment5_post5.save());
  save_comments.push(comment6_post5.save());

  await all(save_comments);

  author1.get("unreadComments").pushObject(comment2_post1);
  author2.get("unreadComments").pushObject(comment3_post3);
  author2.get("unreadComments").pushObject(comment6_post5);

  var save_authors = [];
  save_authors.push(author1.save());
  save_authors.push(author2.save());

  await all(save_authors);

  post1_author1.get("comments").pushObject(comment1_post1);
  post1_author1.get("comments").pushObject(comment2_post1);
  post3_author2.get("comments").pushObject(comment3_post3);
  post5_author2.get("comments").pushObject(comment4_post5);
  post5_author2.get("comments").pushObject(comment5_post5);
  post5_author2.get("comments").pushObject(comment6_post5);

  var save_posts = [];
  save_posts.push(post1_author1.save());
  save_posts.push(post2_author1.save());
  save_posts.push(post3_author2.save());
  save_posts.push(post4_author2.save());
  save_posts.push(post5_author2.save());

  await all(save_posts);

  authorIds.push(author1.id);
  authorIds.push(author2.id);

  postIds.push(post1_author1.id);
  postIds.push(post2_author1.id);
  postIds.push(post3_author2.id);
  postIds.push(post4_author2.id);
  postIds.push(post5_author2.id);

  commentIds.push(comment1_post1.id);
  commentIds.push(comment2_post1.id);
  commentIds.push(comment3_post3.id);
  commentIds.push(comment4_post5.id);
  commentIds.push(comment5_post5.id);
  commentIds.push(comment6_post5.id);
};


/**
 * @description create
 */
test("create", async function(assert) {
  assert.expect(75);

  // there is nothing into the database
  await run(function() {
    getData(adapter, "Author", { order: "position" }).then(function(response) {
      assert.equal(response.results.length, 0, "authors created into the database");
    });

    getData(adapter, "Post", { order: "position" }).then(function(response) {
      assert.equal(response.results.length, 0, "posts created into the database");
    });

    getData(adapter, "Comment", { order: "position" }).then(function(response) {
      assert.equal(response.results.length, 0, "comments created into the database");
    });
  });

  // create the data
  await insertData();

  // check that they are created into the database with the good values
  var authors;
  var posts;
  var comments;

  await run(function() {
    getData(adapter, "Author", { order: "position" }).then(function(response) {
      authors = response.results;

      assert.equal(authors.length, 2, "authors created into the database");
      assert.equal(authors[0].objectId, author1.id, "author1 id");
      assert.equal(authors[1].objectId, author2.id, "author2 id");

      for (let i = 0; i < authors.length; i++) {
        assert.equal(authors[i].position, authors_data[i].position, "author position saved - " + i);
        assert.equal(authors[i].firstName, authors_data[i].firstName, "author firstName saved - " + i);
        assert.equal(authors[i].lastName, authors_data[i].lastName, "author lastName saved - " + i);
        assert.equal(authors[i].address.street, authors_data[i].address.street, "author street address saved - " + i);
        assert.equal(authors[i].address.number, authors_data[i].address.number, "author number address saved - " + i);
        assert.equal(authors[i].address.city, authors_data[i].address.city, "author city address saved - " + i);
        assert.deepEqual(authors[i].address.point, authors_data[i].address.point, "author point address saved - " + i);
      }

      assert.equal(authors[0].unreadComments.length, 1, "author1 unread comments length");
      assert.equal(authors[0].unreadComments[0].objectId, comment2_post1.id, "author1 first unread comment");

      assert.equal(authors[1].unreadComments.length, 2, "author2 unread comments length");
      assert.equal(authors[1].unreadComments[0].objectId, comment3_post3.id, "author2 first unread comment");
      assert.equal(authors[1].unreadComments[1].objectId, comment6_post5.id, "author2 second unread comment");
    });


    getData(adapter, "Post", { order: "position" }).then(function(response) {
      posts = response.results;

      assert.equal(posts.length, 5, "posts created into the database");
      assert.equal(posts[0].objectId, post1_author1.id, "post1 id");
      assert.equal(posts[1].objectId, post2_author1.id, "post2 id");
      assert.equal(posts[2].objectId, post3_author2.id, "post3 id");
      assert.equal(posts[3].objectId, post4_author2.id, "post4 id");
      assert.equal(posts[4].objectId, post5_author2.id, "post5 id");

      for (let i = 0; i < posts.length; i++) {
        assert.equal(posts[i].position, posts_data[i].position, "post position saved - " + i);
        assert.equal(posts[i].title, posts_data[i].title, "post title saved - " + i);
        assert.deepEqual(posts[i].date, {__type: "Date", iso: posts_data[i].date}, "post date saved - " + i);
        assert.deepEqual(posts[i].image, {__type: "File", name: posts_data[i].image, url: "http://localhost:1337/parse/files/appId/" + posts_data[i].image}, "post image saved - " + i);
      }

      assert.deepEqual(posts[0].author, {__type: "Pointer", className: "Author", objectId: author1.id}, "post1 author");
      assert.deepEqual(posts[1].author, {__type: "Pointer", className: "Author", objectId: author1.id}, "post2 author");
      assert.deepEqual(posts[2].author, {__type: "Pointer", className: "Author", objectId: author2.id}, "post3 author");
      assert.deepEqual(posts[3].author, {__type: "Pointer", className: "Author", objectId: author2.id}, "post4 author");
      assert.deepEqual(posts[4].author, {__type: "Pointer", className: "Author", objectId: author2.id}, "post5 author");
    });


    getData(adapter, "Comment", { order: "position" }).then(function(response) {
      comments = response.results;

      assert.equal(comments.length, 6, "comments created into the database");
      assert.equal(comments[0].objectId, comment1_post1.id, "comment1 id");
      assert.equal(comments[1].objectId, comment2_post1.id, "comment2 id");
      assert.equal(comments[2].objectId, comment3_post3.id, "comment3 id");
      assert.equal(comments[3].objectId, comment4_post5.id, "comment4 id");
      assert.equal(comments[4].objectId, comment5_post5.id, "comment5 id");
      assert.equal(comments[5].objectId, comment6_post5.id, "comment6 id");

      for (let i = 0; i < comments.length; i++) {
        assert.equal(comments[i].position, comments_data[i].position, "comment position saved - " + i);
        assert.equal(comments[i].content, comments_data[i].content, "comment content saved - " + i);
      }
    });
  });
});


/**
 * @description create - merge
 */
test("create - merge", async function(assert) {
  assert.expect(8);

  // update some data and save them
  await run(function() {
    author1 = createAuthor(0);

    author1.set("firstName", "Jane");
    author1.set("lastName", "Dawson");
    author1.set("address.city", "Washington");
    author1.set("updateMe", true);
    author1.save();
  });

  await run(function() {
    authorIds.push(author1.id);

    getData(adapter, "Author", { where: {objectId: author1.id} }).then(function(response) {
      assert.equal(response.results[0].firstName, "Jane", "author firstName saved");
      assert.equal(response.results[0].lastName, "Dawson - updated", "author lastName saved");
      assert.equal(response.results[0].address.city, "Washington", "address - updated", "author city address saved");
      assert.equal(response.results[0].updateMe, false, "author updateMe saved");

      assert.equal(author1.get("firstName"), "Jane", "author firstName merged");
      assert.equal(author1.get("lastName"), "Dawson - updated", "author lastName merged");
      assert.equal(author1.get("address.city"), "Washington", "author city address merged");
      assert.equal(author1.get("updateMe"), false, "author updatedMe merged");
    });
  });
});


/**
 * @description update
 */
test("update", async function(assert) {
  assert.expect(7);

  // create the data
  await insertData();

  // update some data and save them
  await run(function() {
    author1.set("firstName", "Jane");
    author1.set("lastName", "Dawson");
    author1.set("address.city", "Washington");
    author1.save();

    post3_author2.set("title", "That's all folks!");
    post3_author2.set("image.name", "Knock! Knock! Knock!");
    post3_author2.save();

    comment6_post5.set("content", "Who's there?");
    comment6_post5.save();
  });

  await run(function() {
    getData(adapter, "Author", { where: {objectId: author1.id} }).then(function(response) {
      assert.equal(response.results[0].firstName, "Jane", "author firstName saved");
      assert.equal(response.results[0].lastName, "Dawson", "author lastName saved");
      assert.equal(response.results[0].address.city, "Washington", "author city address saved");
    });

    getData(adapter, "Post", { where: {objectId: post3_author2.id} }).then(function(response) {
      assert.equal(response.results[0].title, "That's all folks!", "post title saved");
      assert.equal(response.results[0].image.name, "Knock! Knock! Knock!", "post image name saved");
      assert.equal(response.results[0].image.url, "http://localhost:1337/parse/files/appId/Knock!%20Knock!%20Knock!", "post image url saved");
    });

    getData(adapter, "Comment", { where: {objectId: comment6_post5.id} }).then(function(response) {
      assert.equal(response.results[0].content, "Who's there?", "comment saved");
    });
  });
});


/**
 * @description update - merge
 */
test("update - merge", async function(assert) {
  assert.expect(8);

  // create the data
  await insertData();

  // update some data and save them
  await run(function() {
    author1.set("firstName", "Jane");
    author1.set("lastName", "Dawson");
    author1.set("address.city", "Washington");
    author1.set("updateMe", true);
    author1.save();
  });

  await run(function() {
    getData(adapter, "Author", { where: {objectId: author1.id} }).then(function(response) {
      assert.equal(response.results[0].firstName, "Jane", "author firstName saved");
      assert.equal(response.results[0].lastName, "Dawson - updated", "author lastName saved");
      assert.equal(response.results[0].address.city, "Washington", "author city address saved");
      assert.equal(response.results[0].updateMe, false, "author updateMe saved");

      assert.equal(author1.get("firstName"), "Jane", "author firstName merged");
      assert.equal(author1.get("lastName"), "Dawson - updated", "author lastName merged");
      assert.equal(author1.get("address.city"), "Washington", "author city address merged");
      assert.equal(author1.get("updateMe"), false, "author updatedMe merged");
    });
  });
});


/**
 * @description delete
 */
test("delete", async function(assert) {
  assert.expect(4);

  // create the data
  await insertData();

  // delete some of them, and check that they are no more into the database
  await run(function() {
    var authors;

    var promises = [];
    promises.push(author2.destroyRecord());

    promises.push(post2_author1.destroyRecord());
    promises.push(post4_author2.destroyRecord());
    promises.push(post5_author2.destroyRecord());

    promises.push(comment1_post1.destroyRecord());
    promises.push(comment3_post3.destroyRecord());

    all(promises).then(function() {

      getData(adapter, "Author", { order: "position" }).then(function(response) {
        authors = response.results;

        assert.equal(authors.length, 1, "number of authors into the database");
        assert.equal(authors[0].objectId, author1.id, "author1 is still into the database");
      });

      getData(adapter, "Post", { order: "position" }).then(function(response) {
        authors = response.results;

        assert.equal(authors.length, 2, "number of posts into the database");
      });

      getData(adapter, "Comment", { order: "position" }).then(function(response) {
        authors = response.results;

        assert.equal(authors.length, 4, "number of comments into the database");
      });
    });
  });
});


/**
 * @description findRecord/findAll/query
 */
test("findRecord/findAll/query", async function(assert) {
  assert.expect(16);

  // create the data
  await insertData();

  await run(function() {
    // find a record with its id
    store.findRecord("author", author1.id).then(function(result) {
      assert.notOk(isNone(result), "findRecord success");
      assert.equal(result.id, author1.id, "good author id");
    });

    // find all the records
    store.findAll("post").then(function(results) {
      assert.equal(results.get("length"), 5, "findAll success");

      for (let i = 0; i < postIds.length; i++) {
        var post = results.findBy("id", postIds[i]);
        assert.notOk(isNone(post), postIds[i] + " is here");
      }
    });

    // simple query (without where)
    store.query("author", { firstName: "William" }).then(function(results) {
      assert.equal(results.get("length"), 1, "simple query result returned");
      assert.equal(results.objectAt(0).id, author2.id, "simple query result is good");
    });

    // simple query (with where)
    var query = {
      where: { firstName: "William" }
    };

    store.query("author", query).then(function(results) {
      assert.equal(results.get("length"), 1, "simple query (with where) result returned");
      assert.equal(results.objectAt(0).id, author2.id, "simple query (with where) result is good");
    });

    // complex query, with limit, count and order
    query = {
      where: {
        "author": {
          __type: "Pointer",
          className: "Author",
          objectId: author2.id
        }
      },
      order: "-position",
      limit: 2,
      count: 1
    };

    store.query("post", query).then(function(results) {
      assert.equal(results.get("length"), 2, "complex query result returned with limit to 2");
      assert.equal(results.get("meta.count"), 3, "count meta data is here");

      assert.notOk(isNone(results.findBy("id", post4_author2.id)), post4_author2.id + " is here");
      assert.notOk(isNone(results.findBy("id", post5_author2.id)), post5_author2.id + " is here");
    });
  });
});


/**
 * @description belongsTo
 */
test("belongsTo", async function(assert) {
  assert.expect(7);

  // create the data
  await insertData();

  // query by including belongsTo relation
  await run(function() {
    var query = {
      where: {
        "$or": [
          { position: 0 },
          { position: 2 }
        ]
      },
      include: "author",
      order: "position"
    };

    store.query("post", query).then(function(results) {
      assert.equal(results.get("length"), 2, "query with an include for a belongsTo relationship");

      assert.equal(results.objectAt(0).id, post1_author1.id, "first post retreived");
      assert.equal(results.objectAt(0).get("author.id"), author1.id, "author was included into first post");

      assert.equal(results.objectAt(1).id, post3_author2.id, "second post retrived");
      assert.equal(results.objectAt(1).get("author.id"), author2.id, "author was included into second post");
    });
  });

  // remove the belongsTo relation
  post1_author1.set("author", null);
  await post1_author1.save();

  await getData(adapter, "Post", {where: {objectId: post1_author1.id} }).then(function(response) {
    assert.equal(response.results.length, 1, "query to get the post infos");
    assert.equal(response.results[0].author, undefined, "the author should have been removed");
  });
});


/**
 * @description relation
 */
test("relation", async function(assert) {
  assert.expect(19);

  // create the data and some new comments
  await insertData();

  var new_comment1, new_comment2, new_comment3;
  var query = {
    where: {
      $relatedTo: {
        object: {
          __type: "Pointer",
          className: "Post",
          objectId: post2_author1.id
        },
        key: "comments"
      }
    }
  };

  await run(function() {
    new_comment1 = store.createRecord("comment", {
      position: 101,
      content: "Dummy comment 1"
    });

    new_comment2 = store.createRecord("comment", {
      position: 102,
      content: "Dummy comment 2"
    });

    new_comment3 = store.createRecord("comment", {
      position: 103,
      content: "Dummy comment 3"
    });

    new_comment1.save();
    new_comment2.save();
    new_comment3.save();
  });

  // add some comments to a post
  commentIds.push(new_comment1.id);
  commentIds.push(new_comment2.id);
  commentIds.push(new_comment3.id);

  post2_author1.addToRelation("comments", new_comment1); // test the case when add/remove operations are done several times
  post2_author1.addToRelation("comments", new_comment1);

  post2_author1.addToRelation("comments", new_comment2);
  post2_author1.addToRelation("comments", new_comment2);

  post2_author1.addToRelation("comments", new_comment3);
  post2_author1.addToRelation("comments", new_comment3);

  await post2_author1.save();

  await getData(adapter, "Comment", query).then(function(response) {

    var comments = response.results;
    assert.equal(comments.length, 3, "post has 3 comments now");
    assert.equal(post2_author1.get("comments.length"), 3, "post has 3 comments into its relation now");

    var comment1 = A(comments).findBy("objectId", new_comment1.id);
    var comment2 = A(comments).findBy("objectId", new_comment2.id);
    var comment3 = A(comments).findBy("objectId", new_comment3.id);

    assert.notOk(isNone(comment1), "first comment is part of the relation");
    assert.notOk(isNone(comment2), "second comment is part of the relation");
    assert.notOk(isNone(comment3), "third comment is part of the relation");

    assert.equal(comment1.content, new_comment1.get("content"), "check first comment content");
    assert.equal(comment2.content, new_comment2.get("content"), "check second comment content");
    assert.equal(comment3.content, new_comment3.get("content"), "check three comment content");
  });

  // remove some comments from a post
  post2_author1.removeFromRelation("comments", new_comment1); // test the case when add/remove operations are done several times
  post2_author1.removeFromRelation("comments", new_comment1);

  post2_author1.removeFromRelation("comments", new_comment3);
  post2_author1.removeFromRelation("comments", new_comment3);

  await post2_author1.save();

  await getData(adapter, "Comment", query).then(function(response) {

    var comments = response.results;
    assert.equal(comments.length, 1, "post has 1 comment now into the database now");
    assert.equal(post2_author1.get("comments.length"), 1, "post has 1 comment into its relation now");

    assert.equal(comments[0].objectId, new_comment2.id, "second comment still here");
  });

  // add and remove some comments to a post at the same time
  post2_author1.addToRelation("comments", new_comment3); // test the case when add/remove operations are done several times
  post2_author1.removeFromRelation("comments", new_comment3);
  post2_author1.addToRelation("comments", new_comment3);

  post2_author1.removeFromRelation("comments", new_comment2);
  post2_author1.addToRelation("comments", new_comment2);
  post2_author1.removeFromRelation("comments", new_comment2);

  post2_author1.addToRelation("comments", new_comment1);
  post2_author1.removeFromRelation("comments", new_comment1);
  post2_author1.addToRelation("comments", new_comment1);

  await post2_author1.save();

  await getData(adapter, "Comment", query).then(function(response) {

    var comments = response.results;
    assert.equal(comments.length, 2, "post has 2 comments into the database now");
    assert.equal(post2_author1.get("comments.length"), 2, "post has 2 comments into its relation");

    var comment1 = A(comments).findBy("objectId", new_comment1.id);
    var comment3 = A(comments).findBy("objectId", new_comment3.id);

    assert.notOk(isNone(comment1), "first comment is part of the relation");
    assert.notOk(isNone(comment3), "third comment is part of the relation");

    assert.equal(comment1.content, new_comment1.get("content"), "check first comment content");
    assert.equal(comment3.content, new_comment3.get("content"), "check three comment content");
  });

  // remove all
  post2_author1.removeFromRelation("comments", new_comment3);
  post2_author1.removeFromRelation("comments", new_comment1);

  await post2_author1.save();

  await getData(adapter, "Comment", query).then(function(response) {

    var comments = response.results;
    assert.equal(comments.length, 0, "post has no more comment into the database now");
    assert.equal(post2_author1.get("comments.length"), 0, "post has no more comment into its relation");
  });
});


/**
 * @description array
 */
test("array", async function(assert) {
  assert.expect(24);

  // create the data
  await insertData();

  // add some unread comments to an author
  author2.addToRelation("unreadComments", comment4_post5); // test the case when add/remove operations are done several times
  author2.addToRelation("unreadComments", comment4_post5);

  author2.addToRelation("unreadComments", comment5_post5);
  author2.addToRelation("unreadComments", comment5_post5);

  await author2.save();

  await getData(adapter, "Author", {where: {objectId: author2.id} }).then(function(response) {
    assert.equal(response.results.length, 1, "get the author from the database");

    var unread_comments = response.results[0].unreadComments;
    assert.equal(unread_comments.length, 4, "author has 4 unread comments now");

    var unread1 = A(unread_comments).findBy("objectId", comment3_post3.id);
    var unread2 = A(unread_comments).findBy("objectId", comment4_post5.id);
    var unread3 = A(unread_comments).findBy("objectId", comment5_post5.id);
    var unread4 = A(unread_comments).findBy("objectId", comment6_post5.id);

    assert.notOk(isNone(unread1), "first unread comment found");
    assert.notOk(isNone(unread2), "second unread comment found");
    assert.notOk(isNone(unread3), "third unread comment found");
    assert.notOk(isNone(unread4), "fourth unread comment found");
  });


  // remove some unread comments
  author2.removeFromRelation("unreadComments", comment3_post3); // test the case when add/remove operations are done several times
  author2.removeFromRelation("unreadComments", comment3_post3);

  author2.removeFromRelation("unreadComments", comment6_post5);
  author2.removeFromRelation("unreadComments", comment6_post5);

  await author2.save();

  await getData(adapter, "Author", {where: {objectId: author2.id} }).then(function(response) {
    assert.equal(response.results.length, 1, "get the author from the database");

    var unread_comments = response.results[0].unreadComments;
    assert.equal(unread_comments.length, 2, "author has 2 unread comments into databas now");
    assert.equal(author2.get("unreadComments.length"), 2, "author has just 2 comments into its array now");

    var unread1 = A(unread_comments).findBy("objectId", comment4_post5.id);
    var unread2 = A(unread_comments).findBy("objectId", comment5_post5.id);

    assert.notOk(isNone(unread1), "first unread comment");
    assert.notOk(isNone(unread2), "second unread comment");
  });


  // add and remove some unread comments at the same time
  author2.removeFromRelation("unreadComments", comment4_post5); // test the case when add/remove operations are done several times
  author2.addToRelation("unreadComments", comment4_post5);
  author2.removeFromRelation("unreadComments", comment4_post5);

  author2.addToRelation("unreadComments", comment6_post5);
  author2.removeFromRelation("unreadComments", comment6_post5);
  author2.addToRelation("unreadComments", comment6_post5);

  await author2.save();

  await getData(adapter, "Author", {where: {objectId: author2.id} }).then(function(response) {
    assert.equal(response.results.length, 1, "get the author from the database");

    var unread_comments = response.results[0].unreadComments;
    assert.equal(unread_comments.length, 2, "author has 2 unread comments into databas now");
    assert.equal(author2.get("unreadComments.length"), 2, "author has 2 comments into its array now");

    var unread1 = A(unread_comments).findBy("objectId", comment6_post5.id);
    var unread2 = A(unread_comments).findBy("objectId", comment5_post5.id);

    assert.notOk(isNone(unread1), "first unread comment");
    assert.notOk(isNone(unread2), "second unread comment");
  });


  // remove all
  author2.removeFromRelation("unreadComments", comment6_post5);
  author2.removeFromRelation("unreadComments", comment5_post5);

  await author2.save();

  await getData(adapter, "Author", {where: {objectId: author2.id} }).then(function(response) {
    assert.equal(response.results.length, 1, "get the author from the database");

    var unread_comments = response.results[0].unreadComments;
    assert.equal(unread_comments, undefined, "author has no unread comments into database now");
    assert.equal(author2.get("unreadComments.length"), 0, "author has no unread comments into its array now");
  });


  // query by including the objects of the array
  var query = {
    where: {objectId: author1.id},
    include: "unreadComments"
  };

  await store.query("author", query).then(function(results) {
    assert.equal(results.get("length"), 1, "query with an include for an array relationship");

    var author = results.objectAt(0);
    assert.equal(author.id, author1.id, "author retreived");
    assert.equal(author.get("unreadComments.length"), 1, "unread comments included");
    assert.equal(author.get("unreadComments.firstObject.position"), 1, "unread comments position included");
    assert.equal(author.get("unreadComments.firstObject.content"), "Fusce eget diam erat.", "unread comments text included");
  });
});


/**
 * @description Save error
 */
test("Save error", async function(assert) {
  assert.expect(3);

  // try to save the author and catch the raised exception
  await run(function() {
    author1 = createAuthor(0);
    author1.set("saveMeError", 223);

    author1.save().catch(function(error) {
      assert.ok(error && error.error, "custom error returned");

      var error_obj = JSON.parse(error.error);
      assert.ok(error_obj.code, 223, "error code is good");
      assert.ok(error_obj.message, "I am raised", "error message is good");
    });
  });
});


/**
 * @description Delete error
 */
test("Delete error", async function(assert) {
  assert.expect(3);

  // create the author, and set the property to prevent deletion
  await run(function() {
    author1 = createAuthor(0);
    author1.set("deleteMeError", 223);

    author1.save().then(function() {
      authorIds.push(author1.id);
    });
  });

  // try to delete the author and catch the raised exception
  await author1.destroyRecord().catch(function(error) {
    author1.rollbackAttributes();
    assert.ok(error && error.error, "custom error returned");

    var error_obj = JSON.parse(error.error);
    assert.ok(error_obj.code, 223, "error code is good");
    assert.ok(error_obj.message, "I am raised", "error message is good");
  });

  // remove the property that prevents the author to be deleted
  await run(function() {
    author1.set("deleteMeError", 0);
    author1.save();
  });
});
