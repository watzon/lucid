/*
* @adonisjs/lucid
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

/// <reference path="../../adonis-typings/index.ts" />

import test from 'japa'
import { hasManyThrough, column } from '../../src/Orm/Decorators'
import { HasManyThroughQueryBuilder } from '../../src/Orm/Relations/HasManyThrough/QueryBuilder'
import { ormAdapter, getBaseModel, setup, cleanup, resetTables, getDb } from '../../test-helpers'

let db: ReturnType<typeof getDb>
let BaseModel: ReturnType<typeof getBaseModel>

test.group('Model | Has Many Through', (group) => {
  group.before(async () => {
    db = getDb()
    BaseModel = getBaseModel(ormAdapter(db))
    await setup()
  })

  group.after(async () => {
    await cleanup()
    await db.manager.closeAll()
  })

  group.afterEach(async () => {
    await resetTables()
  })

  test('raise error when localKey is missing', (assert) => {
    assert.plan(1)

    try {
      class User extends BaseModel {
      }
      User.$boot()

      class Post extends BaseModel {
      }
      Post.$boot()

      class Country extends BaseModel {
        @hasManyThrough([() => Post, () => User])
        public posts: Post[]
      }
      Country.$boot()

      Country.$getRelation('posts')!.boot()
    } catch ({ message }) {
      assert.equal(
        message,
        'E_MISSING_RELATED_LOCAL_KEY: Country.id required by Country.posts relation is missing',
      )
    }
  })

  test('raise error when foreignKey is missing', (assert) => {
    assert.plan(1)

    try {
      class User extends BaseModel {
      }
      User.$boot()

      class Post extends BaseModel {
      }
      Post.$boot()

      class Country extends BaseModel {
        @column({ primary: true })
        public id: number

        @hasManyThrough([() => Post, () => User])
        public posts: Post[]
      }
      Country.$boot()

      Country.$getRelation('posts')!.boot()
    } catch ({ message }) {
      assert.equal(
        message,
        'E_MISSING_RELATED_FOREIGN_KEY: User.countryId required by Country.posts relation is missing',
      )
    }
  })

  test('raise error when through local key is missing', (assert) => {
    assert.plan(1)

    try {
      class User extends BaseModel {
        @column()
        public countryId: number
      }
      User.$boot()

      class Post extends BaseModel {
      }
      Post.$boot()

      class Country extends BaseModel {
        @column({ primary: true })
        public id: number

        @hasManyThrough([() => Post, () => User])
        public posts: Post[]
      }
      Country.$boot()

      Country.$getRelation('posts')!.boot()
    } catch ({ message }) {
      assert.equal(
        message,
        'E_MISSING_THROUGH_LOCAL_KEY: User.id required by Country.posts relation is missing',
      )
    }
  })

  test('raise error when through foreign key is missing', (assert) => {
    assert.plan(1)

    try {
      class User extends BaseModel {
        @column({ primary: true })
        public id: number

        @column()
        public countryId: number
      }
      User.$boot()

      class Post extends BaseModel {
      }
      Post.$boot()

      class Country extends BaseModel {
        @column({ primary: true })
        public id: number

        @hasManyThrough([() => Post, () => User])
        public posts: Post[]
      }
      Country.$boot()

      Country.$getRelation('posts')!.boot()
    } catch ({ message }) {
      assert.equal(
        message,
        'E_MISSING_THROUGH_FOREIGN_KEY: Post.userId required by Country.posts relation is missing',
      )
    }
  })

  test('get query', (assert) => {
    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public countryId: number
    }
    User.$boot()

    class Post extends BaseModel {
      @column()
      public userId: number
    }
    Post.$boot()

    class Country extends BaseModel {
      @column({ primary: true })
      public id: number

      @hasManyThrough([() => Post, () => User])
      public posts: Post[]
    }
    Country.$boot()

    const country = new Country()
    country.id = 1

    Country.$getRelation('posts')!.boot()

    const { sql, bindings } = Country.$getRelation('posts')!
      .getQuery(country, Country.query().client)
      .applyConstraints()
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = db.query()
      .from('posts')
      .select([
        'posts.*',
        'users.country_id as through_country_id',
      ])
      .innerJoin('users', 'users.id', 'posts.user_id')
      .where('users.country_id', 1)
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })

  test('get eager query', (assert) => {
    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public countryId: number
    }
    User.$boot()

    class Post extends BaseModel {
      @column()
      public userId: number
    }
    Post.$boot()

    class Country extends BaseModel {
      @column({ primary: true })
      public id: number

      @hasManyThrough([() => Post, () => User])
      public posts: Post[]
    }
    Country.$boot()

    const country = new Country()
    country.id = 1

    Country.$getRelation('posts')!.boot()

    const { sql, bindings } = Country.$getRelation('posts')!
      .getEagerQuery([country], Country.query().client)
      .applyConstraints()
      .toSQL()

    const { sql: knexSql, bindings: knexBindings } = db.query()
      .from('posts')
      .select([
        'posts.*',
        'users.country_id as through_country_id',
      ])
      .innerJoin('users', 'users.id', 'posts.user_id')
      .whereIn('users.country_id', [1])
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })

  test('queries must be instance of has many through query builder', (assert) => {
    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public countryId: number
    }
    User.$boot()

    class Post extends BaseModel {
      @column()
      public userId: number
    }
    Post.$boot()

    class Country extends BaseModel {
      @column({ primary: true })
      public id: number

      @hasManyThrough([() => Post, () => User])
      public posts: Post[]
    }
    Country.$boot()

    const country = new Country()
    country.id = 1

    Country.$getRelation('posts')!.boot()

    const query = Country.$getRelation('posts')!.getQuery(country, Country.query().client)
    const eagerQuery = Country.$getRelation('posts')!.getEagerQuery([country], Country.query().client)

    assert.instanceOf(query, HasManyThroughQueryBuilder)
    assert.instanceOf(eagerQuery, HasManyThroughQueryBuilder)
  })

  test('preload relationship', async (assert) => {
    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public countryId: number
    }
    User.$boot()

    class Post extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public userId: number

      @column()
      public title: string
    }
    Post.$boot()

    class Country extends BaseModel {
      @column({ primary: true })
      public id: number

      @hasManyThrough([() => Post, () => User])
      public posts: Post[]
    }
    Country.$boot()

    await db.insertQuery().table('countries').insert([{ name: 'India' }])
    await db.insertQuery().table('users').insert([{ username: 'virk', country_id: 1 }])
    await db.insertQuery().table('posts').insert([
      { title: 'Adonis 101', user_id: 1 },
      { title: 'Lucid 101', user_id: 1 },
    ])

    const countries = await Country.query().preload('posts')
    assert.lengthOf(countries, 1)
    assert.lengthOf(countries[0].posts, 2)
    assert.equal(countries[0].posts[0].title, 'Adonis 101')
    assert.equal(countries[0].posts[0].$extras.through_country_id, 1)

    assert.equal(countries[0].posts[1].title, 'Lucid 101')
    assert.equal(countries[0].posts[1].$extras.through_country_id, 1)
  })

  test('preload many through relationships', async (assert) => {
    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public countryId: number
    }
    User.$boot()

    class Post extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public userId: number

      @column()
      public title: string
    }
    Post.$boot()

    class Country extends BaseModel {
      @column({ primary: true })
      public id: number

      @hasManyThrough([() => Post, () => User])
      public posts: Post[]
    }
    Country.$boot()

    await db.insertQuery().table('countries').insert([{ name: 'India' }])

    await db.insertQuery().table('users').insert([
      { username: 'virk', country_id: 1 },
      { username: 'nikk', country_id: 1 },
    ])

    await db.insertQuery().table('posts').insert([
      { title: 'Adonis 101', user_id: 1 },
      { title: 'Lucid 101', user_id: 1 },
      { title: 'Adonis5', user_id: 2 },
    ])

    const countries = await Country.query().preload('posts')
    assert.lengthOf(countries, 1)
    assert.lengthOf(countries[0].posts, 3)
    assert.equal(countries[0].posts[0].title, 'Adonis 101')
    assert.equal(countries[0].posts[0].$extras.through_country_id, 1)

    assert.equal(countries[0].posts[1].title, 'Lucid 101')
    assert.equal(countries[0].posts[1].$extras.through_country_id, 1)

    assert.equal(countries[0].posts[2].title, 'Adonis5')
    assert.equal(countries[0].posts[2].$extras.through_country_id, 1)
  })

  test('preload many relationships', async (assert) => {
    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public countryId: number
    }
    User.$boot()

    class Post extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public userId: number

      @column()
      public title: string
    }
    Post.$boot()

    class Country extends BaseModel {
      @column({ primary: true })
      public id: number

      @hasManyThrough([() => Post, () => User])
      public posts: Post[]
    }
    Country.$boot()

    await db.insertQuery().table('countries').insert([{ name: 'India' }, { name: 'USA' }])

    await db.insertQuery().table('users').insert([
      { username: 'virk', country_id: 1 },
      { username: 'nikk', country_id: 2 },
    ])

    await db.insertQuery().table('posts').insert([
      { title: 'Adonis 101', user_id: 1 },
      { title: 'Lucid 101', user_id: 1 },
      { title: 'Adonis5', user_id: 2 },
    ])

    const countries = await Country.query().preload('posts')
    assert.lengthOf(countries, 2)
    assert.lengthOf(countries[0].posts, 2)
    assert.lengthOf(countries[1].posts, 1)

    assert.equal(countries[0].posts[0].title, 'Adonis 101')
    assert.equal(countries[0].posts[0].$extras.through_country_id, 1)

    assert.equal(countries[0].posts[1].title, 'Lucid 101')
    assert.equal(countries[0].posts[1].$extras.through_country_id, 1)

    assert.equal(countries[1].posts[0].title, 'Adonis5')
    assert.equal(countries[1].posts[0].$extras.through_country_id, 2)
  })

  test('preload many relationships using model instance', async (assert) => {
    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public countryId: number
    }
    User.$boot()

    class Post extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public userId: number

      @column()
      public title: string
    }
    Post.$boot()

    class Country extends BaseModel {
      @column({ primary: true })
      public id: number

      @hasManyThrough([() => Post, () => User])
      public posts: Post[]
    }
    Country.$boot()

    await db.insertQuery().table('countries').insert([{ name: 'India' }, { name: 'USA' }])

    await db.insertQuery().table('users').insert([
      { username: 'virk', country_id: 1 },
      { username: 'nikk', country_id: 2 },
    ])

    await db.insertQuery().table('posts').insert([
      { title: 'Adonis 101', user_id: 1 },
      { title: 'Lucid 101', user_id: 1 },
      { title: 'Adonis5', user_id: 2 },
    ])

    const countries = await Country.query().orderBy('id', 'asc')
    assert.lengthOf(countries, 2)

    await countries[0].preload('posts')
    await countries[1].preload('posts')

    assert.lengthOf(countries[0].posts, 2)
    assert.lengthOf(countries[1].posts, 1)

    assert.equal(countries[0].posts[0].title, 'Adonis 101')
    assert.equal(countries[0].posts[0].$extras.through_country_id, 1)

    assert.equal(countries[0].posts[1].title, 'Lucid 101')
    assert.equal(countries[0].posts[1].$extras.through_country_id, 1)

    assert.equal(countries[1].posts[0].title, 'Adonis5')
    assert.equal(countries[1].posts[0].$extras.through_country_id, 2)
  })
})

test.group('Model | Has Many Through | fetch', (group) => {
  group.before(async () => {
    db = getDb()
    BaseModel = getBaseModel(ormAdapter(db))
    await setup()
  })

  group.after(async () => {
    await cleanup()
    await db.manager.closeAll()
  })

  group.afterEach(async () => {
    await resetTables()
  })

  test('fetch using model instance', async (assert) => {
    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public countryId: number
    }
    User.$boot()

    class Post extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public userId: number

      @column()
      public title: string
    }
    Post.$boot()

    class Country extends BaseModel {
      @column({ primary: true })
      public id: number

      @hasManyThrough([() => Post, () => User])
      public posts: Post[]
    }
    Country.$boot()

    await db.insertQuery().table('countries').insert([{ name: 'India' }, { name: 'USA' }])

    await db.insertQuery().table('users').insert([
      { username: 'virk', country_id: 1 },
      { username: 'nikk', country_id: 2 },
    ])

    await db.insertQuery().table('posts').insert([
      { title: 'Adonis 101', user_id: 1 },
      { title: 'Lucid 101', user_id: 1 },
      { title: 'Adonis5', user_id: 2 },
    ])

    const country = await Country.query().firstOrFail()
    const posts = await country.related('posts')

    assert.lengthOf(posts, 2)

    assert.equal(posts[0].title, 'Adonis 101')
    assert.equal(posts[0].$extras.through_country_id, 1)

    assert.equal(posts[1].title, 'Lucid 101')
    assert.equal(posts[1].$extras.through_country_id, 1)
  })

  test('fetch using parent model options', async (assert) => {
    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public countryId: number
    }
    User.$boot()

    class Post extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public userId: number

      @column()
      public title: string
    }
    Post.$boot()

    class Country extends BaseModel {
      @column({ primary: true })
      public id: number

      @hasManyThrough([() => Post, () => User])
      public posts: Post[]
    }
    Country.$boot()

    await db.insertQuery().table('countries').insert([{ name: 'India' }, { name: 'USA' }])

    await db.insertQuery().table('users').insert([
      { username: 'virk', country_id: 1 },
      { username: 'nikk', country_id: 2 },
    ])

    await db.insertQuery().table('posts').insert([
      { title: 'Adonis 101', user_id: 1 },
      { title: 'Lucid 101', user_id: 1 },
      { title: 'Adonis5', user_id: 2 },
    ])

    const country = await Country.query({ connection: 'secondary' }).firstOrFail()
    const posts = await country.related<'hasManyThrough', 'posts'>('posts')

    assert.lengthOf(posts, 2)

    assert.equal(posts[0].title, 'Adonis 101')
    assert.equal(posts[0].$options!.connection, 'secondary')
    assert.equal(posts[0].$extras.through_country_id, 1)

    assert.equal(posts[1].title, 'Lucid 101')
    assert.equal(posts[1].$options!.connection, 'secondary')
    assert.equal(posts[1].$extras.through_country_id, 1)
  })
})

test.group('Model | HasManyThrough | bulk operation', (group) => {
  group.before(async () => {
    db = getDb()
    BaseModel = getBaseModel(ormAdapter(db))
    await setup()
  })

  group.after(async () => {
    await cleanup()
    await db.manager.closeAll()
  })

  group.afterEach(async () => {
    await resetTables()
  })

  test('generate correct sql for deleting related rows', async (assert) => {
    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public countryId: number
    }
    User.$boot()

    class Post extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public userId: number

      @column()
      public title: string
    }
    Post.$boot()

    class Country extends BaseModel {
      @column({ primary: true })
      public id: number

      @hasManyThrough([() => Post, () => User])
      public posts: Post[]
    }

    await db.insertQuery().table('countries').insert([{ name: 'India' }, { name: 'USA' }])

    const country = await Country.find(1)
    const { sql, bindings } = country!.related('posts').del().toSQL()

    const { sql: knexSql, bindings: knexBindings } = db.connection()
      .getWriteClient()
      .from('posts')
      .whereIn('posts.user_id', (builder) => {
        builder.from('users').where('users.country_id', 1)
      })
      .del()
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })

  test('generate correct sql for updating related rows', async (assert) => {
    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public countryId: number
    }
    User.$boot()

    class Post extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public userId: number

      @column()
      public title: string
    }
    Post.$boot()

    class Country extends BaseModel {
      @column({ primary: true })
      public id: number

      @hasManyThrough([() => Post, () => User])
      public posts: Post[]
    }

    await db.insertQuery().table('countries').insert([{ name: 'India' }, { name: 'USA' }])

    const country = await Country.find(1)
    const { sql, bindings } = country!.related('posts').update({ title: 'Lucid 101' }).toSQL()

    const { sql: knexSql, bindings: knexBindings } = db.connection()
      .getWriteClient()
      .from('posts')
      .whereIn('posts.user_id', (builder) => {
        builder.from('users').where('users.country_id', 1)
      })
      .update({ title: 'Lucid 101' })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })
})