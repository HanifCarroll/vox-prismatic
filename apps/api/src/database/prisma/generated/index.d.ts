
/**
 * Client
**/

import * as runtime from './runtime/library.js';
import $Types = runtime.Types // general types
import $Public = runtime.Types.Public
import $Utils = runtime.Types.Utils
import $Extensions = runtime.Types.Extensions
import $Result = runtime.Types.Result

export type PrismaPromise<T> = $Public.PrismaPromise<T>


/**
 * Model Transcript
 * 
 */
export type Transcript = $Result.DefaultSelection<Prisma.$TranscriptPayload>
/**
 * Model Insight
 * 
 */
export type Insight = $Result.DefaultSelection<Prisma.$InsightPayload>
/**
 * Model Post
 * 
 */
export type Post = $Result.DefaultSelection<Prisma.$PostPayload>
/**
 * Model ScheduledPost
 * 
 */
export type ScheduledPost = $Result.DefaultSelection<Prisma.$ScheduledPostPayload>
/**
 * Model ProcessingJob
 * 
 */
export type ProcessingJob = $Result.DefaultSelection<Prisma.$ProcessingJobPayload>
/**
 * Model Setting
 * 
 */
export type Setting = $Result.DefaultSelection<Prisma.$SettingPayload>
/**
 * Model AnalyticsEvent
 * 
 */
export type AnalyticsEvent = $Result.DefaultSelection<Prisma.$AnalyticsEventPayload>

/**
 * ##  Prisma Client ʲˢ
 *
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const prisma = new PrismaClient()
 * // Fetch zero or more Transcripts
 * const transcripts = await prisma.transcript.findMany()
 * ```
 *
 *
 * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
 */
export class PrismaClient<
  ClientOptions extends Prisma.PrismaClientOptions = Prisma.PrismaClientOptions,
  const U = 'log' extends keyof ClientOptions ? ClientOptions['log'] extends Array<Prisma.LogLevel | Prisma.LogDefinition> ? Prisma.GetEvents<ClientOptions['log']> : never : never,
  ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs
> {
  [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['other'] }

    /**
   * ##  Prisma Client ʲˢ
   *
   * Type-safe database client for TypeScript & Node.js
   * @example
   * ```
   * const prisma = new PrismaClient()
   * // Fetch zero or more Transcripts
   * const transcripts = await prisma.transcript.findMany()
   * ```
   *
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
   */

  constructor(optionsArg ?: Prisma.Subset<ClientOptions, Prisma.PrismaClientOptions>);
  $on<V extends U>(eventType: V, callback: (event: V extends 'query' ? Prisma.QueryEvent : Prisma.LogEvent) => void): PrismaClient;

  /**
   * Connect with the database
   */
  $connect(): $Utils.JsPromise<void>;

  /**
   * Disconnect from the database
   */
  $disconnect(): $Utils.JsPromise<void>;

/**
   * Executes a prepared raw query and returns the number of affected rows.
   * @example
   * ```
   * const result = await prisma.$executeRaw`UPDATE User SET cool = ${true} WHERE email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Executes a raw query and returns the number of affected rows.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$executeRawUnsafe('UPDATE User SET cool = $1 WHERE email = $2 ;', true, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Performs a prepared raw query and returns the `SELECT` data.
   * @example
   * ```
   * const result = await prisma.$queryRaw`SELECT * FROM User WHERE id = ${1} OR email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<T>;

  /**
   * Performs a raw query and returns the `SELECT` data.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$queryRawUnsafe('SELECT * FROM User WHERE id = $1 OR email = $2;', 1, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<T>;


  /**
   * Allows the running of a sequence of read/write operations that are guaranteed to either succeed or fail as a whole.
   * @example
   * ```
   * const [george, bob, alice] = await prisma.$transaction([
   *   prisma.user.create({ data: { name: 'George' } }),
   *   prisma.user.create({ data: { name: 'Bob' } }),
   *   prisma.user.create({ data: { name: 'Alice' } }),
   * ])
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/concepts/components/prisma-client/transactions).
   */
  $transaction<P extends Prisma.PrismaPromise<any>[]>(arg: [...P], options?: { isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<runtime.Types.Utils.UnwrapTuple<P>>

  $transaction<R>(fn: (prisma: Omit<PrismaClient, runtime.ITXClientDenyList>) => $Utils.JsPromise<R>, options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<R>


  $extends: $Extensions.ExtendsHook<"extends", Prisma.TypeMapCb<ClientOptions>, ExtArgs, $Utils.Call<Prisma.TypeMapCb<ClientOptions>, {
    extArgs: ExtArgs
  }>>

      /**
   * `prisma.transcript`: Exposes CRUD operations for the **Transcript** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Transcripts
    * const transcripts = await prisma.transcript.findMany()
    * ```
    */
  get transcript(): Prisma.TranscriptDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.insight`: Exposes CRUD operations for the **Insight** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Insights
    * const insights = await prisma.insight.findMany()
    * ```
    */
  get insight(): Prisma.InsightDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.post`: Exposes CRUD operations for the **Post** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Posts
    * const posts = await prisma.post.findMany()
    * ```
    */
  get post(): Prisma.PostDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.scheduledPost`: Exposes CRUD operations for the **ScheduledPost** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more ScheduledPosts
    * const scheduledPosts = await prisma.scheduledPost.findMany()
    * ```
    */
  get scheduledPost(): Prisma.ScheduledPostDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.processingJob`: Exposes CRUD operations for the **ProcessingJob** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more ProcessingJobs
    * const processingJobs = await prisma.processingJob.findMany()
    * ```
    */
  get processingJob(): Prisma.ProcessingJobDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.setting`: Exposes CRUD operations for the **Setting** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Settings
    * const settings = await prisma.setting.findMany()
    * ```
    */
  get setting(): Prisma.SettingDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.analyticsEvent`: Exposes CRUD operations for the **AnalyticsEvent** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more AnalyticsEvents
    * const analyticsEvents = await prisma.analyticsEvent.findMany()
    * ```
    */
  get analyticsEvent(): Prisma.AnalyticsEventDelegate<ExtArgs, ClientOptions>;
}

export namespace Prisma {
  export import DMMF = runtime.DMMF

  export type PrismaPromise<T> = $Public.PrismaPromise<T>

  /**
   * Validator
   */
  export import validator = runtime.Public.validator

  /**
   * Prisma Errors
   */
  export import PrismaClientKnownRequestError = runtime.PrismaClientKnownRequestError
  export import PrismaClientUnknownRequestError = runtime.PrismaClientUnknownRequestError
  export import PrismaClientRustPanicError = runtime.PrismaClientRustPanicError
  export import PrismaClientInitializationError = runtime.PrismaClientInitializationError
  export import PrismaClientValidationError = runtime.PrismaClientValidationError

  /**
   * Re-export of sql-template-tag
   */
  export import sql = runtime.sqltag
  export import empty = runtime.empty
  export import join = runtime.join
  export import raw = runtime.raw
  export import Sql = runtime.Sql



  /**
   * Decimal.js
   */
  export import Decimal = runtime.Decimal

  export type DecimalJsLike = runtime.DecimalJsLike

  /**
   * Metrics
   */
  export type Metrics = runtime.Metrics
  export type Metric<T> = runtime.Metric<T>
  export type MetricHistogram = runtime.MetricHistogram
  export type MetricHistogramBucket = runtime.MetricHistogramBucket

  /**
  * Extensions
  */
  export import Extension = $Extensions.UserArgs
  export import getExtensionContext = runtime.Extensions.getExtensionContext
  export import Args = $Public.Args
  export import Payload = $Public.Payload
  export import Result = $Public.Result
  export import Exact = $Public.Exact

  /**
   * Prisma Client JS version: 6.14.0
   * Query Engine version: 717184b7b35ea05dfa71a3236b7af656013e1e49
   */
  export type PrismaVersion = {
    client: string
  }

  export const prismaVersion: PrismaVersion

  /**
   * Utility Types
   */


  export import JsonObject = runtime.JsonObject
  export import JsonArray = runtime.JsonArray
  export import JsonValue = runtime.JsonValue
  export import InputJsonObject = runtime.InputJsonObject
  export import InputJsonArray = runtime.InputJsonArray
  export import InputJsonValue = runtime.InputJsonValue

  /**
   * Types of the values used to represent different kinds of `null` values when working with JSON fields.
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  namespace NullTypes {
    /**
    * Type of `Prisma.DbNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.DbNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class DbNull {
      private DbNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.JsonNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.JsonNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class JsonNull {
      private JsonNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.AnyNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.AnyNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class AnyNull {
      private AnyNull: never
      private constructor()
    }
  }

  /**
   * Helper for filtering JSON entries that have `null` on the database (empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const DbNull: NullTypes.DbNull

  /**
   * Helper for filtering JSON entries that have JSON `null` values (not empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const JsonNull: NullTypes.JsonNull

  /**
   * Helper for filtering JSON entries that are `Prisma.DbNull` or `Prisma.JsonNull`
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const AnyNull: NullTypes.AnyNull

  type SelectAndInclude = {
    select: any
    include: any
  }

  type SelectAndOmit = {
    select: any
    omit: any
  }

  /**
   * Get the type of the value, that the Promise holds.
   */
  export type PromiseType<T extends PromiseLike<any>> = T extends PromiseLike<infer U> ? U : T;

  /**
   * Get the return type of a function which returns a Promise.
   */
  export type PromiseReturnType<T extends (...args: any) => $Utils.JsPromise<any>> = PromiseType<ReturnType<T>>

  /**
   * From T, pick a set of properties whose keys are in the union K
   */
  type Prisma__Pick<T, K extends keyof T> = {
      [P in K]: T[P];
  };


  export type Enumerable<T> = T | Array<T>;

  export type RequiredKeys<T> = {
    [K in keyof T]-?: {} extends Prisma__Pick<T, K> ? never : K
  }[keyof T]

  export type TruthyKeys<T> = keyof {
    [K in keyof T as T[K] extends false | undefined | null ? never : K]: K
  }

  export type TrueKeys<T> = TruthyKeys<Prisma__Pick<T, RequiredKeys<T>>>

  /**
   * Subset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection
   */
  export type Subset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
  };

  /**
   * SelectSubset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection.
   * Additionally, it validates, if both select and include are present. If the case, it errors.
   */
  export type SelectSubset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    (T extends SelectAndInclude
      ? 'Please either choose `select` or `include`.'
      : T extends SelectAndOmit
        ? 'Please either choose `select` or `omit`.'
        : {})

  /**
   * Subset + Intersection
   * @desc From `T` pick properties that exist in `U` and intersect `K`
   */
  export type SubsetIntersection<T, U, K> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    K

  type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

  /**
   * XOR is needed to have a real mutually exclusive union type
   * https://stackoverflow.com/questions/42123407/does-typescript-support-mutually-exclusive-types
   */
  type XOR<T, U> =
    T extends object ?
    U extends object ?
      (Without<T, U> & U) | (Without<U, T> & T)
    : U : T


  /**
   * Is T a Record?
   */
  type IsObject<T extends any> = T extends Array<any>
  ? False
  : T extends Date
  ? False
  : T extends Uint8Array
  ? False
  : T extends BigInt
  ? False
  : T extends object
  ? True
  : False


  /**
   * If it's T[], return T
   */
  export type UnEnumerate<T extends unknown> = T extends Array<infer U> ? U : T

  /**
   * From ts-toolbelt
   */

  type __Either<O extends object, K extends Key> = Omit<O, K> &
    {
      // Merge all but K
      [P in K]: Prisma__Pick<O, P & keyof O> // With K possibilities
    }[K]

  type EitherStrict<O extends object, K extends Key> = Strict<__Either<O, K>>

  type EitherLoose<O extends object, K extends Key> = ComputeRaw<__Either<O, K>>

  type _Either<
    O extends object,
    K extends Key,
    strict extends Boolean
  > = {
    1: EitherStrict<O, K>
    0: EitherLoose<O, K>
  }[strict]

  type Either<
    O extends object,
    K extends Key,
    strict extends Boolean = 1
  > = O extends unknown ? _Either<O, K, strict> : never

  export type Union = any

  type PatchUndefined<O extends object, O1 extends object> = {
    [K in keyof O]: O[K] extends undefined ? At<O1, K> : O[K]
  } & {}

  /** Helper Types for "Merge" **/
  export type IntersectOf<U extends Union> = (
    U extends unknown ? (k: U) => void : never
  ) extends (k: infer I) => void
    ? I
    : never

  export type Overwrite<O extends object, O1 extends object> = {
      [K in keyof O]: K extends keyof O1 ? O1[K] : O[K];
  } & {};

  type _Merge<U extends object> = IntersectOf<Overwrite<U, {
      [K in keyof U]-?: At<U, K>;
  }>>;

  type Key = string | number | symbol;
  type AtBasic<O extends object, K extends Key> = K extends keyof O ? O[K] : never;
  type AtStrict<O extends object, K extends Key> = O[K & keyof O];
  type AtLoose<O extends object, K extends Key> = O extends unknown ? AtStrict<O, K> : never;
  export type At<O extends object, K extends Key, strict extends Boolean = 1> = {
      1: AtStrict<O, K>;
      0: AtLoose<O, K>;
  }[strict];

  export type ComputeRaw<A extends any> = A extends Function ? A : {
    [K in keyof A]: A[K];
  } & {};

  export type OptionalFlat<O> = {
    [K in keyof O]?: O[K];
  } & {};

  type _Record<K extends keyof any, T> = {
    [P in K]: T;
  };

  // cause typescript not to expand types and preserve names
  type NoExpand<T> = T extends unknown ? T : never;

  // this type assumes the passed object is entirely optional
  type AtLeast<O extends object, K extends string> = NoExpand<
    O extends unknown
    ? | (K extends keyof O ? { [P in K]: O[P] } & O : O)
      | {[P in keyof O as P extends K ? P : never]-?: O[P]} & O
    : never>;

  type _Strict<U, _U = U> = U extends unknown ? U & OptionalFlat<_Record<Exclude<Keys<_U>, keyof U>, never>> : never;

  export type Strict<U extends object> = ComputeRaw<_Strict<U>>;
  /** End Helper Types for "Merge" **/

  export type Merge<U extends object> = ComputeRaw<_Merge<Strict<U>>>;

  /**
  A [[Boolean]]
  */
  export type Boolean = True | False

  // /**
  // 1
  // */
  export type True = 1

  /**
  0
  */
  export type False = 0

  export type Not<B extends Boolean> = {
    0: 1
    1: 0
  }[B]

  export type Extends<A1 extends any, A2 extends any> = [A1] extends [never]
    ? 0 // anything `never` is false
    : A1 extends A2
    ? 1
    : 0

  export type Has<U extends Union, U1 extends Union> = Not<
    Extends<Exclude<U1, U>, U1>
  >

  export type Or<B1 extends Boolean, B2 extends Boolean> = {
    0: {
      0: 0
      1: 1
    }
    1: {
      0: 1
      1: 1
    }
  }[B1][B2]

  export type Keys<U extends Union> = U extends unknown ? keyof U : never

  type Cast<A, B> = A extends B ? A : B;

  export const type: unique symbol;



  /**
   * Used by group by
   */

  export type GetScalarType<T, O> = O extends object ? {
    [P in keyof T]: P extends keyof O
      ? O[P]
      : never
  } : never

  type FieldPaths<
    T,
    U = Omit<T, '_avg' | '_sum' | '_count' | '_min' | '_max'>
  > = IsObject<T> extends True ? U : T

  type GetHavingFields<T> = {
    [K in keyof T]: Or<
      Or<Extends<'OR', K>, Extends<'AND', K>>,
      Extends<'NOT', K>
    > extends True
      ? // infer is only needed to not hit TS limit
        // based on the brilliant idea of Pierre-Antoine Mills
        // https://github.com/microsoft/TypeScript/issues/30188#issuecomment-478938437
        T[K] extends infer TK
        ? GetHavingFields<UnEnumerate<TK> extends object ? Merge<UnEnumerate<TK>> : never>
        : never
      : {} extends FieldPaths<T[K]>
      ? never
      : K
  }[keyof T]

  /**
   * Convert tuple to union
   */
  type _TupleToUnion<T> = T extends (infer E)[] ? E : never
  type TupleToUnion<K extends readonly any[]> = _TupleToUnion<K>
  type MaybeTupleToUnion<T> = T extends any[] ? TupleToUnion<T> : T

  /**
   * Like `Pick`, but additionally can also accept an array of keys
   */
  type PickEnumerable<T, K extends Enumerable<keyof T> | keyof T> = Prisma__Pick<T, MaybeTupleToUnion<K>>

  /**
   * Exclude all keys with underscores
   */
  type ExcludeUnderscoreKeys<T extends string> = T extends `_${string}` ? never : T


  export type FieldRef<Model, FieldType> = runtime.FieldRef<Model, FieldType>

  type FieldRefInputType<Model, FieldType> = Model extends never ? never : FieldRef<Model, FieldType>


  export const ModelName: {
    Transcript: 'Transcript',
    Insight: 'Insight',
    Post: 'Post',
    ScheduledPost: 'ScheduledPost',
    ProcessingJob: 'ProcessingJob',
    Setting: 'Setting',
    AnalyticsEvent: 'AnalyticsEvent'
  };

  export type ModelName = (typeof ModelName)[keyof typeof ModelName]


  export type Datasources = {
    db?: Datasource
  }

  interface TypeMapCb<ClientOptions = {}> extends $Utils.Fn<{extArgs: $Extensions.InternalArgs }, $Utils.Record<string, any>> {
    returns: Prisma.TypeMap<this['params']['extArgs'], ClientOptions extends { omit: infer OmitOptions } ? OmitOptions : {}>
  }

  export type TypeMap<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> = {
    globalOmitOptions: {
      omit: GlobalOmitOptions
    }
    meta: {
      modelProps: "transcript" | "insight" | "post" | "scheduledPost" | "processingJob" | "setting" | "analyticsEvent"
      txIsolationLevel: Prisma.TransactionIsolationLevel
    }
    model: {
      Transcript: {
        payload: Prisma.$TranscriptPayload<ExtArgs>
        fields: Prisma.TranscriptFieldRefs
        operations: {
          findUnique: {
            args: Prisma.TranscriptFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TranscriptPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.TranscriptFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TranscriptPayload>
          }
          findFirst: {
            args: Prisma.TranscriptFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TranscriptPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.TranscriptFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TranscriptPayload>
          }
          findMany: {
            args: Prisma.TranscriptFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TranscriptPayload>[]
          }
          create: {
            args: Prisma.TranscriptCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TranscriptPayload>
          }
          createMany: {
            args: Prisma.TranscriptCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.TranscriptCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TranscriptPayload>[]
          }
          delete: {
            args: Prisma.TranscriptDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TranscriptPayload>
          }
          update: {
            args: Prisma.TranscriptUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TranscriptPayload>
          }
          deleteMany: {
            args: Prisma.TranscriptDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.TranscriptUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.TranscriptUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TranscriptPayload>[]
          }
          upsert: {
            args: Prisma.TranscriptUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TranscriptPayload>
          }
          aggregate: {
            args: Prisma.TranscriptAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateTranscript>
          }
          groupBy: {
            args: Prisma.TranscriptGroupByArgs<ExtArgs>
            result: $Utils.Optional<TranscriptGroupByOutputType>[]
          }
          count: {
            args: Prisma.TranscriptCountArgs<ExtArgs>
            result: $Utils.Optional<TranscriptCountAggregateOutputType> | number
          }
        }
      }
      Insight: {
        payload: Prisma.$InsightPayload<ExtArgs>
        fields: Prisma.InsightFieldRefs
        operations: {
          findUnique: {
            args: Prisma.InsightFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$InsightPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.InsightFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$InsightPayload>
          }
          findFirst: {
            args: Prisma.InsightFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$InsightPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.InsightFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$InsightPayload>
          }
          findMany: {
            args: Prisma.InsightFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$InsightPayload>[]
          }
          create: {
            args: Prisma.InsightCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$InsightPayload>
          }
          createMany: {
            args: Prisma.InsightCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.InsightCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$InsightPayload>[]
          }
          delete: {
            args: Prisma.InsightDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$InsightPayload>
          }
          update: {
            args: Prisma.InsightUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$InsightPayload>
          }
          deleteMany: {
            args: Prisma.InsightDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.InsightUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.InsightUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$InsightPayload>[]
          }
          upsert: {
            args: Prisma.InsightUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$InsightPayload>
          }
          aggregate: {
            args: Prisma.InsightAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateInsight>
          }
          groupBy: {
            args: Prisma.InsightGroupByArgs<ExtArgs>
            result: $Utils.Optional<InsightGroupByOutputType>[]
          }
          count: {
            args: Prisma.InsightCountArgs<ExtArgs>
            result: $Utils.Optional<InsightCountAggregateOutputType> | number
          }
        }
      }
      Post: {
        payload: Prisma.$PostPayload<ExtArgs>
        fields: Prisma.PostFieldRefs
        operations: {
          findUnique: {
            args: Prisma.PostFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PostPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.PostFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PostPayload>
          }
          findFirst: {
            args: Prisma.PostFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PostPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.PostFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PostPayload>
          }
          findMany: {
            args: Prisma.PostFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PostPayload>[]
          }
          create: {
            args: Prisma.PostCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PostPayload>
          }
          createMany: {
            args: Prisma.PostCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.PostCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PostPayload>[]
          }
          delete: {
            args: Prisma.PostDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PostPayload>
          }
          update: {
            args: Prisma.PostUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PostPayload>
          }
          deleteMany: {
            args: Prisma.PostDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.PostUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.PostUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PostPayload>[]
          }
          upsert: {
            args: Prisma.PostUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PostPayload>
          }
          aggregate: {
            args: Prisma.PostAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregatePost>
          }
          groupBy: {
            args: Prisma.PostGroupByArgs<ExtArgs>
            result: $Utils.Optional<PostGroupByOutputType>[]
          }
          count: {
            args: Prisma.PostCountArgs<ExtArgs>
            result: $Utils.Optional<PostCountAggregateOutputType> | number
          }
        }
      }
      ScheduledPost: {
        payload: Prisma.$ScheduledPostPayload<ExtArgs>
        fields: Prisma.ScheduledPostFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ScheduledPostFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ScheduledPostPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ScheduledPostFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ScheduledPostPayload>
          }
          findFirst: {
            args: Prisma.ScheduledPostFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ScheduledPostPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ScheduledPostFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ScheduledPostPayload>
          }
          findMany: {
            args: Prisma.ScheduledPostFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ScheduledPostPayload>[]
          }
          create: {
            args: Prisma.ScheduledPostCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ScheduledPostPayload>
          }
          createMany: {
            args: Prisma.ScheduledPostCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.ScheduledPostCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ScheduledPostPayload>[]
          }
          delete: {
            args: Prisma.ScheduledPostDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ScheduledPostPayload>
          }
          update: {
            args: Prisma.ScheduledPostUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ScheduledPostPayload>
          }
          deleteMany: {
            args: Prisma.ScheduledPostDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.ScheduledPostUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.ScheduledPostUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ScheduledPostPayload>[]
          }
          upsert: {
            args: Prisma.ScheduledPostUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ScheduledPostPayload>
          }
          aggregate: {
            args: Prisma.ScheduledPostAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateScheduledPost>
          }
          groupBy: {
            args: Prisma.ScheduledPostGroupByArgs<ExtArgs>
            result: $Utils.Optional<ScheduledPostGroupByOutputType>[]
          }
          count: {
            args: Prisma.ScheduledPostCountArgs<ExtArgs>
            result: $Utils.Optional<ScheduledPostCountAggregateOutputType> | number
          }
        }
      }
      ProcessingJob: {
        payload: Prisma.$ProcessingJobPayload<ExtArgs>
        fields: Prisma.ProcessingJobFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ProcessingJobFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProcessingJobPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ProcessingJobFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProcessingJobPayload>
          }
          findFirst: {
            args: Prisma.ProcessingJobFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProcessingJobPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ProcessingJobFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProcessingJobPayload>
          }
          findMany: {
            args: Prisma.ProcessingJobFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProcessingJobPayload>[]
          }
          create: {
            args: Prisma.ProcessingJobCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProcessingJobPayload>
          }
          createMany: {
            args: Prisma.ProcessingJobCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.ProcessingJobCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProcessingJobPayload>[]
          }
          delete: {
            args: Prisma.ProcessingJobDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProcessingJobPayload>
          }
          update: {
            args: Prisma.ProcessingJobUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProcessingJobPayload>
          }
          deleteMany: {
            args: Prisma.ProcessingJobDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.ProcessingJobUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.ProcessingJobUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProcessingJobPayload>[]
          }
          upsert: {
            args: Prisma.ProcessingJobUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProcessingJobPayload>
          }
          aggregate: {
            args: Prisma.ProcessingJobAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateProcessingJob>
          }
          groupBy: {
            args: Prisma.ProcessingJobGroupByArgs<ExtArgs>
            result: $Utils.Optional<ProcessingJobGroupByOutputType>[]
          }
          count: {
            args: Prisma.ProcessingJobCountArgs<ExtArgs>
            result: $Utils.Optional<ProcessingJobCountAggregateOutputType> | number
          }
        }
      }
      Setting: {
        payload: Prisma.$SettingPayload<ExtArgs>
        fields: Prisma.SettingFieldRefs
        operations: {
          findUnique: {
            args: Prisma.SettingFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SettingPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.SettingFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SettingPayload>
          }
          findFirst: {
            args: Prisma.SettingFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SettingPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.SettingFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SettingPayload>
          }
          findMany: {
            args: Prisma.SettingFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SettingPayload>[]
          }
          create: {
            args: Prisma.SettingCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SettingPayload>
          }
          createMany: {
            args: Prisma.SettingCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.SettingCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SettingPayload>[]
          }
          delete: {
            args: Prisma.SettingDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SettingPayload>
          }
          update: {
            args: Prisma.SettingUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SettingPayload>
          }
          deleteMany: {
            args: Prisma.SettingDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.SettingUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.SettingUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SettingPayload>[]
          }
          upsert: {
            args: Prisma.SettingUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SettingPayload>
          }
          aggregate: {
            args: Prisma.SettingAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateSetting>
          }
          groupBy: {
            args: Prisma.SettingGroupByArgs<ExtArgs>
            result: $Utils.Optional<SettingGroupByOutputType>[]
          }
          count: {
            args: Prisma.SettingCountArgs<ExtArgs>
            result: $Utils.Optional<SettingCountAggregateOutputType> | number
          }
        }
      }
      AnalyticsEvent: {
        payload: Prisma.$AnalyticsEventPayload<ExtArgs>
        fields: Prisma.AnalyticsEventFieldRefs
        operations: {
          findUnique: {
            args: Prisma.AnalyticsEventFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AnalyticsEventPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.AnalyticsEventFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AnalyticsEventPayload>
          }
          findFirst: {
            args: Prisma.AnalyticsEventFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AnalyticsEventPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.AnalyticsEventFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AnalyticsEventPayload>
          }
          findMany: {
            args: Prisma.AnalyticsEventFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AnalyticsEventPayload>[]
          }
          create: {
            args: Prisma.AnalyticsEventCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AnalyticsEventPayload>
          }
          createMany: {
            args: Prisma.AnalyticsEventCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.AnalyticsEventCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AnalyticsEventPayload>[]
          }
          delete: {
            args: Prisma.AnalyticsEventDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AnalyticsEventPayload>
          }
          update: {
            args: Prisma.AnalyticsEventUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AnalyticsEventPayload>
          }
          deleteMany: {
            args: Prisma.AnalyticsEventDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.AnalyticsEventUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.AnalyticsEventUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AnalyticsEventPayload>[]
          }
          upsert: {
            args: Prisma.AnalyticsEventUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AnalyticsEventPayload>
          }
          aggregate: {
            args: Prisma.AnalyticsEventAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateAnalyticsEvent>
          }
          groupBy: {
            args: Prisma.AnalyticsEventGroupByArgs<ExtArgs>
            result: $Utils.Optional<AnalyticsEventGroupByOutputType>[]
          }
          count: {
            args: Prisma.AnalyticsEventCountArgs<ExtArgs>
            result: $Utils.Optional<AnalyticsEventCountAggregateOutputType> | number
          }
        }
      }
    }
  } & {
    other: {
      payload: any
      operations: {
        $executeRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $executeRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
        $queryRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $queryRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
      }
    }
  }
  export const defineExtension: $Extensions.ExtendsHook<"define", Prisma.TypeMapCb, $Extensions.DefaultArgs>
  export type DefaultPrismaClient = PrismaClient
  export type ErrorFormat = 'pretty' | 'colorless' | 'minimal'
  export interface PrismaClientOptions {
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasources?: Datasources
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasourceUrl?: string
    /**
     * @default "colorless"
     */
    errorFormat?: ErrorFormat
    /**
     * @example
     * ```
     * // Shorthand for `emit: 'stdout'`
     * log: ['query', 'info', 'warn', 'error']
     * 
     * // Emit as events only
     * log: [
     *   { emit: 'event', level: 'query' },
     *   { emit: 'event', level: 'info' },
     *   { emit: 'event', level: 'warn' }
     *   { emit: 'event', level: 'error' }
     * ]
     * 
     * / Emit as events and log to stdout
     * og: [
     *  { emit: 'stdout', level: 'query' },
     *  { emit: 'stdout', level: 'info' },
     *  { emit: 'stdout', level: 'warn' }
     *  { emit: 'stdout', level: 'error' }
     * 
     * ```
     * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/logging#the-log-option).
     */
    log?: (LogLevel | LogDefinition)[]
    /**
     * The default values for transactionOptions
     * maxWait ?= 2000
     * timeout ?= 5000
     */
    transactionOptions?: {
      maxWait?: number
      timeout?: number
      isolationLevel?: Prisma.TransactionIsolationLevel
    }
    /**
     * Global configuration for omitting model fields by default.
     * 
     * @example
     * ```
     * const prisma = new PrismaClient({
     *   omit: {
     *     user: {
     *       password: true
     *     }
     *   }
     * })
     * ```
     */
    omit?: Prisma.GlobalOmitConfig
  }
  export type GlobalOmitConfig = {
    transcript?: TranscriptOmit
    insight?: InsightOmit
    post?: PostOmit
    scheduledPost?: ScheduledPostOmit
    processingJob?: ProcessingJobOmit
    setting?: SettingOmit
    analyticsEvent?: AnalyticsEventOmit
  }

  /* Types for Logging */
  export type LogLevel = 'info' | 'query' | 'warn' | 'error'
  export type LogDefinition = {
    level: LogLevel
    emit: 'stdout' | 'event'
  }

  export type CheckIsLogLevel<T> = T extends LogLevel ? T : never;

  export type GetLogType<T> = CheckIsLogLevel<
    T extends LogDefinition ? T['level'] : T
  >;

  export type GetEvents<T extends any[]> = T extends Array<LogLevel | LogDefinition>
    ? GetLogType<T[number]>
    : never;

  export type QueryEvent = {
    timestamp: Date
    query: string
    params: string
    duration: number
    target: string
  }

  export type LogEvent = {
    timestamp: Date
    message: string
    target: string
  }
  /* End Types for Logging */


  export type PrismaAction =
    | 'findUnique'
    | 'findUniqueOrThrow'
    | 'findMany'
    | 'findFirst'
    | 'findFirstOrThrow'
    | 'create'
    | 'createMany'
    | 'createManyAndReturn'
    | 'update'
    | 'updateMany'
    | 'updateManyAndReturn'
    | 'upsert'
    | 'delete'
    | 'deleteMany'
    | 'executeRaw'
    | 'queryRaw'
    | 'aggregate'
    | 'count'
    | 'runCommandRaw'
    | 'findRaw'
    | 'groupBy'

  // tested in getLogLevel.test.ts
  export function getLogLevel(log: Array<LogLevel | LogDefinition>): LogLevel | undefined;

  /**
   * `PrismaClient` proxy available in interactive transactions.
   */
  export type TransactionClient = Omit<Prisma.DefaultPrismaClient, runtime.ITXClientDenyList>

  export type Datasource = {
    url?: string
  }

  /**
   * Count Types
   */


  /**
   * Count Type TranscriptCountOutputType
   */

  export type TranscriptCountOutputType = {
    insights: number
  }

  export type TranscriptCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    insights?: boolean | TranscriptCountOutputTypeCountInsightsArgs
  }

  // Custom InputTypes
  /**
   * TranscriptCountOutputType without action
   */
  export type TranscriptCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TranscriptCountOutputType
     */
    select?: TranscriptCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * TranscriptCountOutputType without action
   */
  export type TranscriptCountOutputTypeCountInsightsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: InsightWhereInput
  }


  /**
   * Count Type InsightCountOutputType
   */

  export type InsightCountOutputType = {
    posts: number
  }

  export type InsightCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    posts?: boolean | InsightCountOutputTypeCountPostsArgs
  }

  // Custom InputTypes
  /**
   * InsightCountOutputType without action
   */
  export type InsightCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the InsightCountOutputType
     */
    select?: InsightCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * InsightCountOutputType without action
   */
  export type InsightCountOutputTypeCountPostsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: PostWhereInput
  }


  /**
   * Count Type PostCountOutputType
   */

  export type PostCountOutputType = {
    scheduledPosts: number
  }

  export type PostCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    scheduledPosts?: boolean | PostCountOutputTypeCountScheduledPostsArgs
  }

  // Custom InputTypes
  /**
   * PostCountOutputType without action
   */
  export type PostCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PostCountOutputType
     */
    select?: PostCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * PostCountOutputType without action
   */
  export type PostCountOutputTypeCountScheduledPostsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ScheduledPostWhereInput
  }


  /**
   * Models
   */

  /**
   * Model Transcript
   */

  export type AggregateTranscript = {
    _count: TranscriptCountAggregateOutputType | null
    _avg: TranscriptAvgAggregateOutputType | null
    _sum: TranscriptSumAggregateOutputType | null
    _min: TranscriptMinAggregateOutputType | null
    _max: TranscriptMaxAggregateOutputType | null
  }

  export type TranscriptAvgAggregateOutputType = {
    duration: number | null
    wordCount: number | null
  }

  export type TranscriptSumAggregateOutputType = {
    duration: number | null
    wordCount: number | null
  }

  export type TranscriptMinAggregateOutputType = {
    id: string | null
    title: string | null
    rawContent: string | null
    cleanedContent: string | null
    status: string | null
    sourceType: string | null
    sourceUrl: string | null
    fileName: string | null
    duration: number | null
    wordCount: number | null
    filePath: string | null
    createdAt: string | null
    updatedAt: string | null
  }

  export type TranscriptMaxAggregateOutputType = {
    id: string | null
    title: string | null
    rawContent: string | null
    cleanedContent: string | null
    status: string | null
    sourceType: string | null
    sourceUrl: string | null
    fileName: string | null
    duration: number | null
    wordCount: number | null
    filePath: string | null
    createdAt: string | null
    updatedAt: string | null
  }

  export type TranscriptCountAggregateOutputType = {
    id: number
    title: number
    rawContent: number
    cleanedContent: number
    status: number
    sourceType: number
    sourceUrl: number
    fileName: number
    duration: number
    wordCount: number
    filePath: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type TranscriptAvgAggregateInputType = {
    duration?: true
    wordCount?: true
  }

  export type TranscriptSumAggregateInputType = {
    duration?: true
    wordCount?: true
  }

  export type TranscriptMinAggregateInputType = {
    id?: true
    title?: true
    rawContent?: true
    cleanedContent?: true
    status?: true
    sourceType?: true
    sourceUrl?: true
    fileName?: true
    duration?: true
    wordCount?: true
    filePath?: true
    createdAt?: true
    updatedAt?: true
  }

  export type TranscriptMaxAggregateInputType = {
    id?: true
    title?: true
    rawContent?: true
    cleanedContent?: true
    status?: true
    sourceType?: true
    sourceUrl?: true
    fileName?: true
    duration?: true
    wordCount?: true
    filePath?: true
    createdAt?: true
    updatedAt?: true
  }

  export type TranscriptCountAggregateInputType = {
    id?: true
    title?: true
    rawContent?: true
    cleanedContent?: true
    status?: true
    sourceType?: true
    sourceUrl?: true
    fileName?: true
    duration?: true
    wordCount?: true
    filePath?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type TranscriptAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Transcript to aggregate.
     */
    where?: TranscriptWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Transcripts to fetch.
     */
    orderBy?: TranscriptOrderByWithRelationInput | TranscriptOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: TranscriptWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Transcripts from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Transcripts.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Transcripts
    **/
    _count?: true | TranscriptCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: TranscriptAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: TranscriptSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: TranscriptMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: TranscriptMaxAggregateInputType
  }

  export type GetTranscriptAggregateType<T extends TranscriptAggregateArgs> = {
        [P in keyof T & keyof AggregateTranscript]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateTranscript[P]>
      : GetScalarType<T[P], AggregateTranscript[P]>
  }




  export type TranscriptGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TranscriptWhereInput
    orderBy?: TranscriptOrderByWithAggregationInput | TranscriptOrderByWithAggregationInput[]
    by: TranscriptScalarFieldEnum[] | TranscriptScalarFieldEnum
    having?: TranscriptScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: TranscriptCountAggregateInputType | true
    _avg?: TranscriptAvgAggregateInputType
    _sum?: TranscriptSumAggregateInputType
    _min?: TranscriptMinAggregateInputType
    _max?: TranscriptMaxAggregateInputType
  }

  export type TranscriptGroupByOutputType = {
    id: string
    title: string
    rawContent: string
    cleanedContent: string | null
    status: string
    sourceType: string | null
    sourceUrl: string | null
    fileName: string | null
    duration: number | null
    wordCount: number
    filePath: string | null
    createdAt: string
    updatedAt: string
    _count: TranscriptCountAggregateOutputType | null
    _avg: TranscriptAvgAggregateOutputType | null
    _sum: TranscriptSumAggregateOutputType | null
    _min: TranscriptMinAggregateOutputType | null
    _max: TranscriptMaxAggregateOutputType | null
  }

  type GetTranscriptGroupByPayload<T extends TranscriptGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<TranscriptGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof TranscriptGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], TranscriptGroupByOutputType[P]>
            : GetScalarType<T[P], TranscriptGroupByOutputType[P]>
        }
      >
    >


  export type TranscriptSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    title?: boolean
    rawContent?: boolean
    cleanedContent?: boolean
    status?: boolean
    sourceType?: boolean
    sourceUrl?: boolean
    fileName?: boolean
    duration?: boolean
    wordCount?: boolean
    filePath?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    insights?: boolean | Transcript$insightsArgs<ExtArgs>
    _count?: boolean | TranscriptCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["transcript"]>

  export type TranscriptSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    title?: boolean
    rawContent?: boolean
    cleanedContent?: boolean
    status?: boolean
    sourceType?: boolean
    sourceUrl?: boolean
    fileName?: boolean
    duration?: boolean
    wordCount?: boolean
    filePath?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["transcript"]>

  export type TranscriptSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    title?: boolean
    rawContent?: boolean
    cleanedContent?: boolean
    status?: boolean
    sourceType?: boolean
    sourceUrl?: boolean
    fileName?: boolean
    duration?: boolean
    wordCount?: boolean
    filePath?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["transcript"]>

  export type TranscriptSelectScalar = {
    id?: boolean
    title?: boolean
    rawContent?: boolean
    cleanedContent?: boolean
    status?: boolean
    sourceType?: boolean
    sourceUrl?: boolean
    fileName?: boolean
    duration?: boolean
    wordCount?: boolean
    filePath?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type TranscriptOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "title" | "rawContent" | "cleanedContent" | "status" | "sourceType" | "sourceUrl" | "fileName" | "duration" | "wordCount" | "filePath" | "createdAt" | "updatedAt", ExtArgs["result"]["transcript"]>
  export type TranscriptInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    insights?: boolean | Transcript$insightsArgs<ExtArgs>
    _count?: boolean | TranscriptCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type TranscriptIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}
  export type TranscriptIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}

  export type $TranscriptPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Transcript"
    objects: {
      insights: Prisma.$InsightPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      title: string
      rawContent: string
      cleanedContent: string | null
      status: string
      sourceType: string | null
      sourceUrl: string | null
      fileName: string | null
      duration: number | null
      wordCount: number
      filePath: string | null
      createdAt: string
      updatedAt: string
    }, ExtArgs["result"]["transcript"]>
    composites: {}
  }

  type TranscriptGetPayload<S extends boolean | null | undefined | TranscriptDefaultArgs> = $Result.GetResult<Prisma.$TranscriptPayload, S>

  type TranscriptCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<TranscriptFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: TranscriptCountAggregateInputType | true
    }

  export interface TranscriptDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Transcript'], meta: { name: 'Transcript' } }
    /**
     * Find zero or one Transcript that matches the filter.
     * @param {TranscriptFindUniqueArgs} args - Arguments to find a Transcript
     * @example
     * // Get one Transcript
     * const transcript = await prisma.transcript.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends TranscriptFindUniqueArgs>(args: SelectSubset<T, TranscriptFindUniqueArgs<ExtArgs>>): Prisma__TranscriptClient<$Result.GetResult<Prisma.$TranscriptPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Transcript that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {TranscriptFindUniqueOrThrowArgs} args - Arguments to find a Transcript
     * @example
     * // Get one Transcript
     * const transcript = await prisma.transcript.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends TranscriptFindUniqueOrThrowArgs>(args: SelectSubset<T, TranscriptFindUniqueOrThrowArgs<ExtArgs>>): Prisma__TranscriptClient<$Result.GetResult<Prisma.$TranscriptPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Transcript that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TranscriptFindFirstArgs} args - Arguments to find a Transcript
     * @example
     * // Get one Transcript
     * const transcript = await prisma.transcript.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends TranscriptFindFirstArgs>(args?: SelectSubset<T, TranscriptFindFirstArgs<ExtArgs>>): Prisma__TranscriptClient<$Result.GetResult<Prisma.$TranscriptPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Transcript that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TranscriptFindFirstOrThrowArgs} args - Arguments to find a Transcript
     * @example
     * // Get one Transcript
     * const transcript = await prisma.transcript.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends TranscriptFindFirstOrThrowArgs>(args?: SelectSubset<T, TranscriptFindFirstOrThrowArgs<ExtArgs>>): Prisma__TranscriptClient<$Result.GetResult<Prisma.$TranscriptPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Transcripts that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TranscriptFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Transcripts
     * const transcripts = await prisma.transcript.findMany()
     * 
     * // Get first 10 Transcripts
     * const transcripts = await prisma.transcript.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const transcriptWithIdOnly = await prisma.transcript.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends TranscriptFindManyArgs>(args?: SelectSubset<T, TranscriptFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TranscriptPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Transcript.
     * @param {TranscriptCreateArgs} args - Arguments to create a Transcript.
     * @example
     * // Create one Transcript
     * const Transcript = await prisma.transcript.create({
     *   data: {
     *     // ... data to create a Transcript
     *   }
     * })
     * 
     */
    create<T extends TranscriptCreateArgs>(args: SelectSubset<T, TranscriptCreateArgs<ExtArgs>>): Prisma__TranscriptClient<$Result.GetResult<Prisma.$TranscriptPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Transcripts.
     * @param {TranscriptCreateManyArgs} args - Arguments to create many Transcripts.
     * @example
     * // Create many Transcripts
     * const transcript = await prisma.transcript.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends TranscriptCreateManyArgs>(args?: SelectSubset<T, TranscriptCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Transcripts and returns the data saved in the database.
     * @param {TranscriptCreateManyAndReturnArgs} args - Arguments to create many Transcripts.
     * @example
     * // Create many Transcripts
     * const transcript = await prisma.transcript.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Transcripts and only return the `id`
     * const transcriptWithIdOnly = await prisma.transcript.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends TranscriptCreateManyAndReturnArgs>(args?: SelectSubset<T, TranscriptCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TranscriptPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Transcript.
     * @param {TranscriptDeleteArgs} args - Arguments to delete one Transcript.
     * @example
     * // Delete one Transcript
     * const Transcript = await prisma.transcript.delete({
     *   where: {
     *     // ... filter to delete one Transcript
     *   }
     * })
     * 
     */
    delete<T extends TranscriptDeleteArgs>(args: SelectSubset<T, TranscriptDeleteArgs<ExtArgs>>): Prisma__TranscriptClient<$Result.GetResult<Prisma.$TranscriptPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Transcript.
     * @param {TranscriptUpdateArgs} args - Arguments to update one Transcript.
     * @example
     * // Update one Transcript
     * const transcript = await prisma.transcript.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends TranscriptUpdateArgs>(args: SelectSubset<T, TranscriptUpdateArgs<ExtArgs>>): Prisma__TranscriptClient<$Result.GetResult<Prisma.$TranscriptPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Transcripts.
     * @param {TranscriptDeleteManyArgs} args - Arguments to filter Transcripts to delete.
     * @example
     * // Delete a few Transcripts
     * const { count } = await prisma.transcript.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends TranscriptDeleteManyArgs>(args?: SelectSubset<T, TranscriptDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Transcripts.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TranscriptUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Transcripts
     * const transcript = await prisma.transcript.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends TranscriptUpdateManyArgs>(args: SelectSubset<T, TranscriptUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Transcripts and returns the data updated in the database.
     * @param {TranscriptUpdateManyAndReturnArgs} args - Arguments to update many Transcripts.
     * @example
     * // Update many Transcripts
     * const transcript = await prisma.transcript.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Transcripts and only return the `id`
     * const transcriptWithIdOnly = await prisma.transcript.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends TranscriptUpdateManyAndReturnArgs>(args: SelectSubset<T, TranscriptUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TranscriptPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Transcript.
     * @param {TranscriptUpsertArgs} args - Arguments to update or create a Transcript.
     * @example
     * // Update or create a Transcript
     * const transcript = await prisma.transcript.upsert({
     *   create: {
     *     // ... data to create a Transcript
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Transcript we want to update
     *   }
     * })
     */
    upsert<T extends TranscriptUpsertArgs>(args: SelectSubset<T, TranscriptUpsertArgs<ExtArgs>>): Prisma__TranscriptClient<$Result.GetResult<Prisma.$TranscriptPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Transcripts.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TranscriptCountArgs} args - Arguments to filter Transcripts to count.
     * @example
     * // Count the number of Transcripts
     * const count = await prisma.transcript.count({
     *   where: {
     *     // ... the filter for the Transcripts we want to count
     *   }
     * })
    **/
    count<T extends TranscriptCountArgs>(
      args?: Subset<T, TranscriptCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], TranscriptCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Transcript.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TranscriptAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends TranscriptAggregateArgs>(args: Subset<T, TranscriptAggregateArgs>): Prisma.PrismaPromise<GetTranscriptAggregateType<T>>

    /**
     * Group by Transcript.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TranscriptGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends TranscriptGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: TranscriptGroupByArgs['orderBy'] }
        : { orderBy?: TranscriptGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, TranscriptGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetTranscriptGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Transcript model
   */
  readonly fields: TranscriptFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Transcript.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__TranscriptClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    insights<T extends Transcript$insightsArgs<ExtArgs> = {}>(args?: Subset<T, Transcript$insightsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$InsightPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Transcript model
   */
  interface TranscriptFieldRefs {
    readonly id: FieldRef<"Transcript", 'String'>
    readonly title: FieldRef<"Transcript", 'String'>
    readonly rawContent: FieldRef<"Transcript", 'String'>
    readonly cleanedContent: FieldRef<"Transcript", 'String'>
    readonly status: FieldRef<"Transcript", 'String'>
    readonly sourceType: FieldRef<"Transcript", 'String'>
    readonly sourceUrl: FieldRef<"Transcript", 'String'>
    readonly fileName: FieldRef<"Transcript", 'String'>
    readonly duration: FieldRef<"Transcript", 'Int'>
    readonly wordCount: FieldRef<"Transcript", 'Int'>
    readonly filePath: FieldRef<"Transcript", 'String'>
    readonly createdAt: FieldRef<"Transcript", 'String'>
    readonly updatedAt: FieldRef<"Transcript", 'String'>
  }
    

  // Custom InputTypes
  /**
   * Transcript findUnique
   */
  export type TranscriptFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Transcript
     */
    select?: TranscriptSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Transcript
     */
    omit?: TranscriptOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TranscriptInclude<ExtArgs> | null
    /**
     * Filter, which Transcript to fetch.
     */
    where: TranscriptWhereUniqueInput
  }

  /**
   * Transcript findUniqueOrThrow
   */
  export type TranscriptFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Transcript
     */
    select?: TranscriptSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Transcript
     */
    omit?: TranscriptOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TranscriptInclude<ExtArgs> | null
    /**
     * Filter, which Transcript to fetch.
     */
    where: TranscriptWhereUniqueInput
  }

  /**
   * Transcript findFirst
   */
  export type TranscriptFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Transcript
     */
    select?: TranscriptSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Transcript
     */
    omit?: TranscriptOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TranscriptInclude<ExtArgs> | null
    /**
     * Filter, which Transcript to fetch.
     */
    where?: TranscriptWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Transcripts to fetch.
     */
    orderBy?: TranscriptOrderByWithRelationInput | TranscriptOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Transcripts.
     */
    cursor?: TranscriptWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Transcripts from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Transcripts.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Transcripts.
     */
    distinct?: TranscriptScalarFieldEnum | TranscriptScalarFieldEnum[]
  }

  /**
   * Transcript findFirstOrThrow
   */
  export type TranscriptFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Transcript
     */
    select?: TranscriptSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Transcript
     */
    omit?: TranscriptOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TranscriptInclude<ExtArgs> | null
    /**
     * Filter, which Transcript to fetch.
     */
    where?: TranscriptWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Transcripts to fetch.
     */
    orderBy?: TranscriptOrderByWithRelationInput | TranscriptOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Transcripts.
     */
    cursor?: TranscriptWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Transcripts from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Transcripts.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Transcripts.
     */
    distinct?: TranscriptScalarFieldEnum | TranscriptScalarFieldEnum[]
  }

  /**
   * Transcript findMany
   */
  export type TranscriptFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Transcript
     */
    select?: TranscriptSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Transcript
     */
    omit?: TranscriptOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TranscriptInclude<ExtArgs> | null
    /**
     * Filter, which Transcripts to fetch.
     */
    where?: TranscriptWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Transcripts to fetch.
     */
    orderBy?: TranscriptOrderByWithRelationInput | TranscriptOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Transcripts.
     */
    cursor?: TranscriptWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Transcripts from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Transcripts.
     */
    skip?: number
    distinct?: TranscriptScalarFieldEnum | TranscriptScalarFieldEnum[]
  }

  /**
   * Transcript create
   */
  export type TranscriptCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Transcript
     */
    select?: TranscriptSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Transcript
     */
    omit?: TranscriptOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TranscriptInclude<ExtArgs> | null
    /**
     * The data needed to create a Transcript.
     */
    data: XOR<TranscriptCreateInput, TranscriptUncheckedCreateInput>
  }

  /**
   * Transcript createMany
   */
  export type TranscriptCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Transcripts.
     */
    data: TranscriptCreateManyInput | TranscriptCreateManyInput[]
  }

  /**
   * Transcript createManyAndReturn
   */
  export type TranscriptCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Transcript
     */
    select?: TranscriptSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Transcript
     */
    omit?: TranscriptOmit<ExtArgs> | null
    /**
     * The data used to create many Transcripts.
     */
    data: TranscriptCreateManyInput | TranscriptCreateManyInput[]
  }

  /**
   * Transcript update
   */
  export type TranscriptUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Transcript
     */
    select?: TranscriptSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Transcript
     */
    omit?: TranscriptOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TranscriptInclude<ExtArgs> | null
    /**
     * The data needed to update a Transcript.
     */
    data: XOR<TranscriptUpdateInput, TranscriptUncheckedUpdateInput>
    /**
     * Choose, which Transcript to update.
     */
    where: TranscriptWhereUniqueInput
  }

  /**
   * Transcript updateMany
   */
  export type TranscriptUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Transcripts.
     */
    data: XOR<TranscriptUpdateManyMutationInput, TranscriptUncheckedUpdateManyInput>
    /**
     * Filter which Transcripts to update
     */
    where?: TranscriptWhereInput
    /**
     * Limit how many Transcripts to update.
     */
    limit?: number
  }

  /**
   * Transcript updateManyAndReturn
   */
  export type TranscriptUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Transcript
     */
    select?: TranscriptSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Transcript
     */
    omit?: TranscriptOmit<ExtArgs> | null
    /**
     * The data used to update Transcripts.
     */
    data: XOR<TranscriptUpdateManyMutationInput, TranscriptUncheckedUpdateManyInput>
    /**
     * Filter which Transcripts to update
     */
    where?: TranscriptWhereInput
    /**
     * Limit how many Transcripts to update.
     */
    limit?: number
  }

  /**
   * Transcript upsert
   */
  export type TranscriptUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Transcript
     */
    select?: TranscriptSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Transcript
     */
    omit?: TranscriptOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TranscriptInclude<ExtArgs> | null
    /**
     * The filter to search for the Transcript to update in case it exists.
     */
    where: TranscriptWhereUniqueInput
    /**
     * In case the Transcript found by the `where` argument doesn't exist, create a new Transcript with this data.
     */
    create: XOR<TranscriptCreateInput, TranscriptUncheckedCreateInput>
    /**
     * In case the Transcript was found with the provided `where` argument, update it with this data.
     */
    update: XOR<TranscriptUpdateInput, TranscriptUncheckedUpdateInput>
  }

  /**
   * Transcript delete
   */
  export type TranscriptDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Transcript
     */
    select?: TranscriptSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Transcript
     */
    omit?: TranscriptOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TranscriptInclude<ExtArgs> | null
    /**
     * Filter which Transcript to delete.
     */
    where: TranscriptWhereUniqueInput
  }

  /**
   * Transcript deleteMany
   */
  export type TranscriptDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Transcripts to delete
     */
    where?: TranscriptWhereInput
    /**
     * Limit how many Transcripts to delete.
     */
    limit?: number
  }

  /**
   * Transcript.insights
   */
  export type Transcript$insightsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Insight
     */
    select?: InsightSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Insight
     */
    omit?: InsightOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InsightInclude<ExtArgs> | null
    where?: InsightWhereInput
    orderBy?: InsightOrderByWithRelationInput | InsightOrderByWithRelationInput[]
    cursor?: InsightWhereUniqueInput
    take?: number
    skip?: number
    distinct?: InsightScalarFieldEnum | InsightScalarFieldEnum[]
  }

  /**
   * Transcript without action
   */
  export type TranscriptDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Transcript
     */
    select?: TranscriptSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Transcript
     */
    omit?: TranscriptOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TranscriptInclude<ExtArgs> | null
  }


  /**
   * Model Insight
   */

  export type AggregateInsight = {
    _count: InsightCountAggregateOutputType | null
    _avg: InsightAvgAggregateOutputType | null
    _sum: InsightSumAggregateOutputType | null
    _min: InsightMinAggregateOutputType | null
    _max: InsightMaxAggregateOutputType | null
  }

  export type InsightAvgAggregateOutputType = {
    urgencyScore: number | null
    relatabilityScore: number | null
    specificityScore: number | null
    authorityScore: number | null
    totalScore: number | null
    processingDurationMs: number | null
    estimatedTokens: number | null
    estimatedCost: number | null
  }

  export type InsightSumAggregateOutputType = {
    urgencyScore: number | null
    relatabilityScore: number | null
    specificityScore: number | null
    authorityScore: number | null
    totalScore: number | null
    processingDurationMs: number | null
    estimatedTokens: number | null
    estimatedCost: number | null
  }

  export type InsightMinAggregateOutputType = {
    id: string | null
    cleanedTranscriptId: string | null
    title: string | null
    summary: string | null
    verbatimQuote: string | null
    category: string | null
    postType: string | null
    urgencyScore: number | null
    relatabilityScore: number | null
    specificityScore: number | null
    authorityScore: number | null
    totalScore: number | null
    status: string | null
    processingDurationMs: number | null
    estimatedTokens: number | null
    estimatedCost: number | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type InsightMaxAggregateOutputType = {
    id: string | null
    cleanedTranscriptId: string | null
    title: string | null
    summary: string | null
    verbatimQuote: string | null
    category: string | null
    postType: string | null
    urgencyScore: number | null
    relatabilityScore: number | null
    specificityScore: number | null
    authorityScore: number | null
    totalScore: number | null
    status: string | null
    processingDurationMs: number | null
    estimatedTokens: number | null
    estimatedCost: number | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type InsightCountAggregateOutputType = {
    id: number
    cleanedTranscriptId: number
    title: number
    summary: number
    verbatimQuote: number
    category: number
    postType: number
    urgencyScore: number
    relatabilityScore: number
    specificityScore: number
    authorityScore: number
    totalScore: number
    status: number
    processingDurationMs: number
    estimatedTokens: number
    estimatedCost: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type InsightAvgAggregateInputType = {
    urgencyScore?: true
    relatabilityScore?: true
    specificityScore?: true
    authorityScore?: true
    totalScore?: true
    processingDurationMs?: true
    estimatedTokens?: true
    estimatedCost?: true
  }

  export type InsightSumAggregateInputType = {
    urgencyScore?: true
    relatabilityScore?: true
    specificityScore?: true
    authorityScore?: true
    totalScore?: true
    processingDurationMs?: true
    estimatedTokens?: true
    estimatedCost?: true
  }

  export type InsightMinAggregateInputType = {
    id?: true
    cleanedTranscriptId?: true
    title?: true
    summary?: true
    verbatimQuote?: true
    category?: true
    postType?: true
    urgencyScore?: true
    relatabilityScore?: true
    specificityScore?: true
    authorityScore?: true
    totalScore?: true
    status?: true
    processingDurationMs?: true
    estimatedTokens?: true
    estimatedCost?: true
    createdAt?: true
    updatedAt?: true
  }

  export type InsightMaxAggregateInputType = {
    id?: true
    cleanedTranscriptId?: true
    title?: true
    summary?: true
    verbatimQuote?: true
    category?: true
    postType?: true
    urgencyScore?: true
    relatabilityScore?: true
    specificityScore?: true
    authorityScore?: true
    totalScore?: true
    status?: true
    processingDurationMs?: true
    estimatedTokens?: true
    estimatedCost?: true
    createdAt?: true
    updatedAt?: true
  }

  export type InsightCountAggregateInputType = {
    id?: true
    cleanedTranscriptId?: true
    title?: true
    summary?: true
    verbatimQuote?: true
    category?: true
    postType?: true
    urgencyScore?: true
    relatabilityScore?: true
    specificityScore?: true
    authorityScore?: true
    totalScore?: true
    status?: true
    processingDurationMs?: true
    estimatedTokens?: true
    estimatedCost?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type InsightAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Insight to aggregate.
     */
    where?: InsightWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Insights to fetch.
     */
    orderBy?: InsightOrderByWithRelationInput | InsightOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: InsightWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Insights from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Insights.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Insights
    **/
    _count?: true | InsightCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: InsightAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: InsightSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: InsightMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: InsightMaxAggregateInputType
  }

  export type GetInsightAggregateType<T extends InsightAggregateArgs> = {
        [P in keyof T & keyof AggregateInsight]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateInsight[P]>
      : GetScalarType<T[P], AggregateInsight[P]>
  }




  export type InsightGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: InsightWhereInput
    orderBy?: InsightOrderByWithAggregationInput | InsightOrderByWithAggregationInput[]
    by: InsightScalarFieldEnum[] | InsightScalarFieldEnum
    having?: InsightScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: InsightCountAggregateInputType | true
    _avg?: InsightAvgAggregateInputType
    _sum?: InsightSumAggregateInputType
    _min?: InsightMinAggregateInputType
    _max?: InsightMaxAggregateInputType
  }

  export type InsightGroupByOutputType = {
    id: string
    cleanedTranscriptId: string
    title: string
    summary: string
    verbatimQuote: string
    category: string
    postType: string
    urgencyScore: number
    relatabilityScore: number
    specificityScore: number
    authorityScore: number
    totalScore: number
    status: string
    processingDurationMs: number | null
    estimatedTokens: number | null
    estimatedCost: number | null
    createdAt: Date
    updatedAt: Date
    _count: InsightCountAggregateOutputType | null
    _avg: InsightAvgAggregateOutputType | null
    _sum: InsightSumAggregateOutputType | null
    _min: InsightMinAggregateOutputType | null
    _max: InsightMaxAggregateOutputType | null
  }

  type GetInsightGroupByPayload<T extends InsightGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<InsightGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof InsightGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], InsightGroupByOutputType[P]>
            : GetScalarType<T[P], InsightGroupByOutputType[P]>
        }
      >
    >


  export type InsightSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    cleanedTranscriptId?: boolean
    title?: boolean
    summary?: boolean
    verbatimQuote?: boolean
    category?: boolean
    postType?: boolean
    urgencyScore?: boolean
    relatabilityScore?: boolean
    specificityScore?: boolean
    authorityScore?: boolean
    totalScore?: boolean
    status?: boolean
    processingDurationMs?: boolean
    estimatedTokens?: boolean
    estimatedCost?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    transcript?: boolean | TranscriptDefaultArgs<ExtArgs>
    posts?: boolean | Insight$postsArgs<ExtArgs>
    _count?: boolean | InsightCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["insight"]>

  export type InsightSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    cleanedTranscriptId?: boolean
    title?: boolean
    summary?: boolean
    verbatimQuote?: boolean
    category?: boolean
    postType?: boolean
    urgencyScore?: boolean
    relatabilityScore?: boolean
    specificityScore?: boolean
    authorityScore?: boolean
    totalScore?: boolean
    status?: boolean
    processingDurationMs?: boolean
    estimatedTokens?: boolean
    estimatedCost?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    transcript?: boolean | TranscriptDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["insight"]>

  export type InsightSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    cleanedTranscriptId?: boolean
    title?: boolean
    summary?: boolean
    verbatimQuote?: boolean
    category?: boolean
    postType?: boolean
    urgencyScore?: boolean
    relatabilityScore?: boolean
    specificityScore?: boolean
    authorityScore?: boolean
    totalScore?: boolean
    status?: boolean
    processingDurationMs?: boolean
    estimatedTokens?: boolean
    estimatedCost?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    transcript?: boolean | TranscriptDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["insight"]>

  export type InsightSelectScalar = {
    id?: boolean
    cleanedTranscriptId?: boolean
    title?: boolean
    summary?: boolean
    verbatimQuote?: boolean
    category?: boolean
    postType?: boolean
    urgencyScore?: boolean
    relatabilityScore?: boolean
    specificityScore?: boolean
    authorityScore?: boolean
    totalScore?: boolean
    status?: boolean
    processingDurationMs?: boolean
    estimatedTokens?: boolean
    estimatedCost?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type InsightOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "cleanedTranscriptId" | "title" | "summary" | "verbatimQuote" | "category" | "postType" | "urgencyScore" | "relatabilityScore" | "specificityScore" | "authorityScore" | "totalScore" | "status" | "processingDurationMs" | "estimatedTokens" | "estimatedCost" | "createdAt" | "updatedAt", ExtArgs["result"]["insight"]>
  export type InsightInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    transcript?: boolean | TranscriptDefaultArgs<ExtArgs>
    posts?: boolean | Insight$postsArgs<ExtArgs>
    _count?: boolean | InsightCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type InsightIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    transcript?: boolean | TranscriptDefaultArgs<ExtArgs>
  }
  export type InsightIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    transcript?: boolean | TranscriptDefaultArgs<ExtArgs>
  }

  export type $InsightPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Insight"
    objects: {
      transcript: Prisma.$TranscriptPayload<ExtArgs>
      posts: Prisma.$PostPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      cleanedTranscriptId: string
      title: string
      summary: string
      verbatimQuote: string
      category: string
      postType: string
      urgencyScore: number
      relatabilityScore: number
      specificityScore: number
      authorityScore: number
      totalScore: number
      status: string
      processingDurationMs: number | null
      estimatedTokens: number | null
      estimatedCost: number | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["insight"]>
    composites: {}
  }

  type InsightGetPayload<S extends boolean | null | undefined | InsightDefaultArgs> = $Result.GetResult<Prisma.$InsightPayload, S>

  type InsightCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<InsightFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: InsightCountAggregateInputType | true
    }

  export interface InsightDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Insight'], meta: { name: 'Insight' } }
    /**
     * Find zero or one Insight that matches the filter.
     * @param {InsightFindUniqueArgs} args - Arguments to find a Insight
     * @example
     * // Get one Insight
     * const insight = await prisma.insight.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends InsightFindUniqueArgs>(args: SelectSubset<T, InsightFindUniqueArgs<ExtArgs>>): Prisma__InsightClient<$Result.GetResult<Prisma.$InsightPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Insight that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {InsightFindUniqueOrThrowArgs} args - Arguments to find a Insight
     * @example
     * // Get one Insight
     * const insight = await prisma.insight.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends InsightFindUniqueOrThrowArgs>(args: SelectSubset<T, InsightFindUniqueOrThrowArgs<ExtArgs>>): Prisma__InsightClient<$Result.GetResult<Prisma.$InsightPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Insight that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {InsightFindFirstArgs} args - Arguments to find a Insight
     * @example
     * // Get one Insight
     * const insight = await prisma.insight.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends InsightFindFirstArgs>(args?: SelectSubset<T, InsightFindFirstArgs<ExtArgs>>): Prisma__InsightClient<$Result.GetResult<Prisma.$InsightPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Insight that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {InsightFindFirstOrThrowArgs} args - Arguments to find a Insight
     * @example
     * // Get one Insight
     * const insight = await prisma.insight.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends InsightFindFirstOrThrowArgs>(args?: SelectSubset<T, InsightFindFirstOrThrowArgs<ExtArgs>>): Prisma__InsightClient<$Result.GetResult<Prisma.$InsightPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Insights that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {InsightFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Insights
     * const insights = await prisma.insight.findMany()
     * 
     * // Get first 10 Insights
     * const insights = await prisma.insight.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const insightWithIdOnly = await prisma.insight.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends InsightFindManyArgs>(args?: SelectSubset<T, InsightFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$InsightPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Insight.
     * @param {InsightCreateArgs} args - Arguments to create a Insight.
     * @example
     * // Create one Insight
     * const Insight = await prisma.insight.create({
     *   data: {
     *     // ... data to create a Insight
     *   }
     * })
     * 
     */
    create<T extends InsightCreateArgs>(args: SelectSubset<T, InsightCreateArgs<ExtArgs>>): Prisma__InsightClient<$Result.GetResult<Prisma.$InsightPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Insights.
     * @param {InsightCreateManyArgs} args - Arguments to create many Insights.
     * @example
     * // Create many Insights
     * const insight = await prisma.insight.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends InsightCreateManyArgs>(args?: SelectSubset<T, InsightCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Insights and returns the data saved in the database.
     * @param {InsightCreateManyAndReturnArgs} args - Arguments to create many Insights.
     * @example
     * // Create many Insights
     * const insight = await prisma.insight.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Insights and only return the `id`
     * const insightWithIdOnly = await prisma.insight.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends InsightCreateManyAndReturnArgs>(args?: SelectSubset<T, InsightCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$InsightPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Insight.
     * @param {InsightDeleteArgs} args - Arguments to delete one Insight.
     * @example
     * // Delete one Insight
     * const Insight = await prisma.insight.delete({
     *   where: {
     *     // ... filter to delete one Insight
     *   }
     * })
     * 
     */
    delete<T extends InsightDeleteArgs>(args: SelectSubset<T, InsightDeleteArgs<ExtArgs>>): Prisma__InsightClient<$Result.GetResult<Prisma.$InsightPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Insight.
     * @param {InsightUpdateArgs} args - Arguments to update one Insight.
     * @example
     * // Update one Insight
     * const insight = await prisma.insight.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends InsightUpdateArgs>(args: SelectSubset<T, InsightUpdateArgs<ExtArgs>>): Prisma__InsightClient<$Result.GetResult<Prisma.$InsightPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Insights.
     * @param {InsightDeleteManyArgs} args - Arguments to filter Insights to delete.
     * @example
     * // Delete a few Insights
     * const { count } = await prisma.insight.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends InsightDeleteManyArgs>(args?: SelectSubset<T, InsightDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Insights.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {InsightUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Insights
     * const insight = await prisma.insight.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends InsightUpdateManyArgs>(args: SelectSubset<T, InsightUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Insights and returns the data updated in the database.
     * @param {InsightUpdateManyAndReturnArgs} args - Arguments to update many Insights.
     * @example
     * // Update many Insights
     * const insight = await prisma.insight.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Insights and only return the `id`
     * const insightWithIdOnly = await prisma.insight.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends InsightUpdateManyAndReturnArgs>(args: SelectSubset<T, InsightUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$InsightPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Insight.
     * @param {InsightUpsertArgs} args - Arguments to update or create a Insight.
     * @example
     * // Update or create a Insight
     * const insight = await prisma.insight.upsert({
     *   create: {
     *     // ... data to create a Insight
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Insight we want to update
     *   }
     * })
     */
    upsert<T extends InsightUpsertArgs>(args: SelectSubset<T, InsightUpsertArgs<ExtArgs>>): Prisma__InsightClient<$Result.GetResult<Prisma.$InsightPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Insights.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {InsightCountArgs} args - Arguments to filter Insights to count.
     * @example
     * // Count the number of Insights
     * const count = await prisma.insight.count({
     *   where: {
     *     // ... the filter for the Insights we want to count
     *   }
     * })
    **/
    count<T extends InsightCountArgs>(
      args?: Subset<T, InsightCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], InsightCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Insight.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {InsightAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends InsightAggregateArgs>(args: Subset<T, InsightAggregateArgs>): Prisma.PrismaPromise<GetInsightAggregateType<T>>

    /**
     * Group by Insight.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {InsightGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends InsightGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: InsightGroupByArgs['orderBy'] }
        : { orderBy?: InsightGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, InsightGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetInsightGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Insight model
   */
  readonly fields: InsightFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Insight.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__InsightClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    transcript<T extends TranscriptDefaultArgs<ExtArgs> = {}>(args?: Subset<T, TranscriptDefaultArgs<ExtArgs>>): Prisma__TranscriptClient<$Result.GetResult<Prisma.$TranscriptPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    posts<T extends Insight$postsArgs<ExtArgs> = {}>(args?: Subset<T, Insight$postsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PostPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Insight model
   */
  interface InsightFieldRefs {
    readonly id: FieldRef<"Insight", 'String'>
    readonly cleanedTranscriptId: FieldRef<"Insight", 'String'>
    readonly title: FieldRef<"Insight", 'String'>
    readonly summary: FieldRef<"Insight", 'String'>
    readonly verbatimQuote: FieldRef<"Insight", 'String'>
    readonly category: FieldRef<"Insight", 'String'>
    readonly postType: FieldRef<"Insight", 'String'>
    readonly urgencyScore: FieldRef<"Insight", 'Int'>
    readonly relatabilityScore: FieldRef<"Insight", 'Int'>
    readonly specificityScore: FieldRef<"Insight", 'Int'>
    readonly authorityScore: FieldRef<"Insight", 'Int'>
    readonly totalScore: FieldRef<"Insight", 'Int'>
    readonly status: FieldRef<"Insight", 'String'>
    readonly processingDurationMs: FieldRef<"Insight", 'Int'>
    readonly estimatedTokens: FieldRef<"Insight", 'Int'>
    readonly estimatedCost: FieldRef<"Insight", 'Float'>
    readonly createdAt: FieldRef<"Insight", 'DateTime'>
    readonly updatedAt: FieldRef<"Insight", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Insight findUnique
   */
  export type InsightFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Insight
     */
    select?: InsightSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Insight
     */
    omit?: InsightOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InsightInclude<ExtArgs> | null
    /**
     * Filter, which Insight to fetch.
     */
    where: InsightWhereUniqueInput
  }

  /**
   * Insight findUniqueOrThrow
   */
  export type InsightFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Insight
     */
    select?: InsightSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Insight
     */
    omit?: InsightOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InsightInclude<ExtArgs> | null
    /**
     * Filter, which Insight to fetch.
     */
    where: InsightWhereUniqueInput
  }

  /**
   * Insight findFirst
   */
  export type InsightFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Insight
     */
    select?: InsightSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Insight
     */
    omit?: InsightOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InsightInclude<ExtArgs> | null
    /**
     * Filter, which Insight to fetch.
     */
    where?: InsightWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Insights to fetch.
     */
    orderBy?: InsightOrderByWithRelationInput | InsightOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Insights.
     */
    cursor?: InsightWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Insights from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Insights.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Insights.
     */
    distinct?: InsightScalarFieldEnum | InsightScalarFieldEnum[]
  }

  /**
   * Insight findFirstOrThrow
   */
  export type InsightFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Insight
     */
    select?: InsightSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Insight
     */
    omit?: InsightOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InsightInclude<ExtArgs> | null
    /**
     * Filter, which Insight to fetch.
     */
    where?: InsightWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Insights to fetch.
     */
    orderBy?: InsightOrderByWithRelationInput | InsightOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Insights.
     */
    cursor?: InsightWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Insights from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Insights.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Insights.
     */
    distinct?: InsightScalarFieldEnum | InsightScalarFieldEnum[]
  }

  /**
   * Insight findMany
   */
  export type InsightFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Insight
     */
    select?: InsightSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Insight
     */
    omit?: InsightOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InsightInclude<ExtArgs> | null
    /**
     * Filter, which Insights to fetch.
     */
    where?: InsightWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Insights to fetch.
     */
    orderBy?: InsightOrderByWithRelationInput | InsightOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Insights.
     */
    cursor?: InsightWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Insights from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Insights.
     */
    skip?: number
    distinct?: InsightScalarFieldEnum | InsightScalarFieldEnum[]
  }

  /**
   * Insight create
   */
  export type InsightCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Insight
     */
    select?: InsightSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Insight
     */
    omit?: InsightOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InsightInclude<ExtArgs> | null
    /**
     * The data needed to create a Insight.
     */
    data: XOR<InsightCreateInput, InsightUncheckedCreateInput>
  }

  /**
   * Insight createMany
   */
  export type InsightCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Insights.
     */
    data: InsightCreateManyInput | InsightCreateManyInput[]
  }

  /**
   * Insight createManyAndReturn
   */
  export type InsightCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Insight
     */
    select?: InsightSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Insight
     */
    omit?: InsightOmit<ExtArgs> | null
    /**
     * The data used to create many Insights.
     */
    data: InsightCreateManyInput | InsightCreateManyInput[]
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InsightIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Insight update
   */
  export type InsightUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Insight
     */
    select?: InsightSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Insight
     */
    omit?: InsightOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InsightInclude<ExtArgs> | null
    /**
     * The data needed to update a Insight.
     */
    data: XOR<InsightUpdateInput, InsightUncheckedUpdateInput>
    /**
     * Choose, which Insight to update.
     */
    where: InsightWhereUniqueInput
  }

  /**
   * Insight updateMany
   */
  export type InsightUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Insights.
     */
    data: XOR<InsightUpdateManyMutationInput, InsightUncheckedUpdateManyInput>
    /**
     * Filter which Insights to update
     */
    where?: InsightWhereInput
    /**
     * Limit how many Insights to update.
     */
    limit?: number
  }

  /**
   * Insight updateManyAndReturn
   */
  export type InsightUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Insight
     */
    select?: InsightSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Insight
     */
    omit?: InsightOmit<ExtArgs> | null
    /**
     * The data used to update Insights.
     */
    data: XOR<InsightUpdateManyMutationInput, InsightUncheckedUpdateManyInput>
    /**
     * Filter which Insights to update
     */
    where?: InsightWhereInput
    /**
     * Limit how many Insights to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InsightIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Insight upsert
   */
  export type InsightUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Insight
     */
    select?: InsightSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Insight
     */
    omit?: InsightOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InsightInclude<ExtArgs> | null
    /**
     * The filter to search for the Insight to update in case it exists.
     */
    where: InsightWhereUniqueInput
    /**
     * In case the Insight found by the `where` argument doesn't exist, create a new Insight with this data.
     */
    create: XOR<InsightCreateInput, InsightUncheckedCreateInput>
    /**
     * In case the Insight was found with the provided `where` argument, update it with this data.
     */
    update: XOR<InsightUpdateInput, InsightUncheckedUpdateInput>
  }

  /**
   * Insight delete
   */
  export type InsightDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Insight
     */
    select?: InsightSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Insight
     */
    omit?: InsightOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InsightInclude<ExtArgs> | null
    /**
     * Filter which Insight to delete.
     */
    where: InsightWhereUniqueInput
  }

  /**
   * Insight deleteMany
   */
  export type InsightDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Insights to delete
     */
    where?: InsightWhereInput
    /**
     * Limit how many Insights to delete.
     */
    limit?: number
  }

  /**
   * Insight.posts
   */
  export type Insight$postsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Post
     */
    select?: PostSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Post
     */
    omit?: PostOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PostInclude<ExtArgs> | null
    where?: PostWhereInput
    orderBy?: PostOrderByWithRelationInput | PostOrderByWithRelationInput[]
    cursor?: PostWhereUniqueInput
    take?: number
    skip?: number
    distinct?: PostScalarFieldEnum | PostScalarFieldEnum[]
  }

  /**
   * Insight without action
   */
  export type InsightDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Insight
     */
    select?: InsightSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Insight
     */
    omit?: InsightOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InsightInclude<ExtArgs> | null
  }


  /**
   * Model Post
   */

  export type AggregatePost = {
    _count: PostCountAggregateOutputType | null
    _avg: PostAvgAggregateOutputType | null
    _sum: PostSumAggregateOutputType | null
    _min: PostMinAggregateOutputType | null
    _max: PostMaxAggregateOutputType | null
  }

  export type PostAvgAggregateOutputType = {
    characterCount: number | null
  }

  export type PostSumAggregateOutputType = {
    characterCount: number | null
  }

  export type PostMinAggregateOutputType = {
    id: string | null
    insightId: string | null
    title: string | null
    platform: string | null
    content: string | null
    status: string | null
    characterCount: number | null
    createdAt: string | null
    updatedAt: string | null
  }

  export type PostMaxAggregateOutputType = {
    id: string | null
    insightId: string | null
    title: string | null
    platform: string | null
    content: string | null
    status: string | null
    characterCount: number | null
    createdAt: string | null
    updatedAt: string | null
  }

  export type PostCountAggregateOutputType = {
    id: number
    insightId: number
    title: number
    platform: number
    content: number
    status: number
    characterCount: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type PostAvgAggregateInputType = {
    characterCount?: true
  }

  export type PostSumAggregateInputType = {
    characterCount?: true
  }

  export type PostMinAggregateInputType = {
    id?: true
    insightId?: true
    title?: true
    platform?: true
    content?: true
    status?: true
    characterCount?: true
    createdAt?: true
    updatedAt?: true
  }

  export type PostMaxAggregateInputType = {
    id?: true
    insightId?: true
    title?: true
    platform?: true
    content?: true
    status?: true
    characterCount?: true
    createdAt?: true
    updatedAt?: true
  }

  export type PostCountAggregateInputType = {
    id?: true
    insightId?: true
    title?: true
    platform?: true
    content?: true
    status?: true
    characterCount?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type PostAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Post to aggregate.
     */
    where?: PostWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Posts to fetch.
     */
    orderBy?: PostOrderByWithRelationInput | PostOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: PostWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Posts from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Posts.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Posts
    **/
    _count?: true | PostCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: PostAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: PostSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: PostMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: PostMaxAggregateInputType
  }

  export type GetPostAggregateType<T extends PostAggregateArgs> = {
        [P in keyof T & keyof AggregatePost]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregatePost[P]>
      : GetScalarType<T[P], AggregatePost[P]>
  }




  export type PostGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: PostWhereInput
    orderBy?: PostOrderByWithAggregationInput | PostOrderByWithAggregationInput[]
    by: PostScalarFieldEnum[] | PostScalarFieldEnum
    having?: PostScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: PostCountAggregateInputType | true
    _avg?: PostAvgAggregateInputType
    _sum?: PostSumAggregateInputType
    _min?: PostMinAggregateInputType
    _max?: PostMaxAggregateInputType
  }

  export type PostGroupByOutputType = {
    id: string
    insightId: string
    title: string
    platform: string
    content: string
    status: string
    characterCount: number | null
    createdAt: string
    updatedAt: string
    _count: PostCountAggregateOutputType | null
    _avg: PostAvgAggregateOutputType | null
    _sum: PostSumAggregateOutputType | null
    _min: PostMinAggregateOutputType | null
    _max: PostMaxAggregateOutputType | null
  }

  type GetPostGroupByPayload<T extends PostGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<PostGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof PostGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], PostGroupByOutputType[P]>
            : GetScalarType<T[P], PostGroupByOutputType[P]>
        }
      >
    >


  export type PostSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    insightId?: boolean
    title?: boolean
    platform?: boolean
    content?: boolean
    status?: boolean
    characterCount?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    insight?: boolean | InsightDefaultArgs<ExtArgs>
    scheduledPosts?: boolean | Post$scheduledPostsArgs<ExtArgs>
    _count?: boolean | PostCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["post"]>

  export type PostSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    insightId?: boolean
    title?: boolean
    platform?: boolean
    content?: boolean
    status?: boolean
    characterCount?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    insight?: boolean | InsightDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["post"]>

  export type PostSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    insightId?: boolean
    title?: boolean
    platform?: boolean
    content?: boolean
    status?: boolean
    characterCount?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    insight?: boolean | InsightDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["post"]>

  export type PostSelectScalar = {
    id?: boolean
    insightId?: boolean
    title?: boolean
    platform?: boolean
    content?: boolean
    status?: boolean
    characterCount?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type PostOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "insightId" | "title" | "platform" | "content" | "status" | "characterCount" | "createdAt" | "updatedAt", ExtArgs["result"]["post"]>
  export type PostInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    insight?: boolean | InsightDefaultArgs<ExtArgs>
    scheduledPosts?: boolean | Post$scheduledPostsArgs<ExtArgs>
    _count?: boolean | PostCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type PostIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    insight?: boolean | InsightDefaultArgs<ExtArgs>
  }
  export type PostIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    insight?: boolean | InsightDefaultArgs<ExtArgs>
  }

  export type $PostPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Post"
    objects: {
      insight: Prisma.$InsightPayload<ExtArgs>
      scheduledPosts: Prisma.$ScheduledPostPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      insightId: string
      title: string
      platform: string
      content: string
      status: string
      characterCount: number | null
      createdAt: string
      updatedAt: string
    }, ExtArgs["result"]["post"]>
    composites: {}
  }

  type PostGetPayload<S extends boolean | null | undefined | PostDefaultArgs> = $Result.GetResult<Prisma.$PostPayload, S>

  type PostCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<PostFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: PostCountAggregateInputType | true
    }

  export interface PostDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Post'], meta: { name: 'Post' } }
    /**
     * Find zero or one Post that matches the filter.
     * @param {PostFindUniqueArgs} args - Arguments to find a Post
     * @example
     * // Get one Post
     * const post = await prisma.post.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends PostFindUniqueArgs>(args: SelectSubset<T, PostFindUniqueArgs<ExtArgs>>): Prisma__PostClient<$Result.GetResult<Prisma.$PostPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Post that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {PostFindUniqueOrThrowArgs} args - Arguments to find a Post
     * @example
     * // Get one Post
     * const post = await prisma.post.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends PostFindUniqueOrThrowArgs>(args: SelectSubset<T, PostFindUniqueOrThrowArgs<ExtArgs>>): Prisma__PostClient<$Result.GetResult<Prisma.$PostPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Post that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PostFindFirstArgs} args - Arguments to find a Post
     * @example
     * // Get one Post
     * const post = await prisma.post.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends PostFindFirstArgs>(args?: SelectSubset<T, PostFindFirstArgs<ExtArgs>>): Prisma__PostClient<$Result.GetResult<Prisma.$PostPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Post that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PostFindFirstOrThrowArgs} args - Arguments to find a Post
     * @example
     * // Get one Post
     * const post = await prisma.post.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends PostFindFirstOrThrowArgs>(args?: SelectSubset<T, PostFindFirstOrThrowArgs<ExtArgs>>): Prisma__PostClient<$Result.GetResult<Prisma.$PostPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Posts that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PostFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Posts
     * const posts = await prisma.post.findMany()
     * 
     * // Get first 10 Posts
     * const posts = await prisma.post.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const postWithIdOnly = await prisma.post.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends PostFindManyArgs>(args?: SelectSubset<T, PostFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PostPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Post.
     * @param {PostCreateArgs} args - Arguments to create a Post.
     * @example
     * // Create one Post
     * const Post = await prisma.post.create({
     *   data: {
     *     // ... data to create a Post
     *   }
     * })
     * 
     */
    create<T extends PostCreateArgs>(args: SelectSubset<T, PostCreateArgs<ExtArgs>>): Prisma__PostClient<$Result.GetResult<Prisma.$PostPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Posts.
     * @param {PostCreateManyArgs} args - Arguments to create many Posts.
     * @example
     * // Create many Posts
     * const post = await prisma.post.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends PostCreateManyArgs>(args?: SelectSubset<T, PostCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Posts and returns the data saved in the database.
     * @param {PostCreateManyAndReturnArgs} args - Arguments to create many Posts.
     * @example
     * // Create many Posts
     * const post = await prisma.post.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Posts and only return the `id`
     * const postWithIdOnly = await prisma.post.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends PostCreateManyAndReturnArgs>(args?: SelectSubset<T, PostCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PostPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Post.
     * @param {PostDeleteArgs} args - Arguments to delete one Post.
     * @example
     * // Delete one Post
     * const Post = await prisma.post.delete({
     *   where: {
     *     // ... filter to delete one Post
     *   }
     * })
     * 
     */
    delete<T extends PostDeleteArgs>(args: SelectSubset<T, PostDeleteArgs<ExtArgs>>): Prisma__PostClient<$Result.GetResult<Prisma.$PostPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Post.
     * @param {PostUpdateArgs} args - Arguments to update one Post.
     * @example
     * // Update one Post
     * const post = await prisma.post.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends PostUpdateArgs>(args: SelectSubset<T, PostUpdateArgs<ExtArgs>>): Prisma__PostClient<$Result.GetResult<Prisma.$PostPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Posts.
     * @param {PostDeleteManyArgs} args - Arguments to filter Posts to delete.
     * @example
     * // Delete a few Posts
     * const { count } = await prisma.post.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends PostDeleteManyArgs>(args?: SelectSubset<T, PostDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Posts.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PostUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Posts
     * const post = await prisma.post.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends PostUpdateManyArgs>(args: SelectSubset<T, PostUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Posts and returns the data updated in the database.
     * @param {PostUpdateManyAndReturnArgs} args - Arguments to update many Posts.
     * @example
     * // Update many Posts
     * const post = await prisma.post.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Posts and only return the `id`
     * const postWithIdOnly = await prisma.post.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends PostUpdateManyAndReturnArgs>(args: SelectSubset<T, PostUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PostPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Post.
     * @param {PostUpsertArgs} args - Arguments to update or create a Post.
     * @example
     * // Update or create a Post
     * const post = await prisma.post.upsert({
     *   create: {
     *     // ... data to create a Post
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Post we want to update
     *   }
     * })
     */
    upsert<T extends PostUpsertArgs>(args: SelectSubset<T, PostUpsertArgs<ExtArgs>>): Prisma__PostClient<$Result.GetResult<Prisma.$PostPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Posts.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PostCountArgs} args - Arguments to filter Posts to count.
     * @example
     * // Count the number of Posts
     * const count = await prisma.post.count({
     *   where: {
     *     // ... the filter for the Posts we want to count
     *   }
     * })
    **/
    count<T extends PostCountArgs>(
      args?: Subset<T, PostCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], PostCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Post.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PostAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends PostAggregateArgs>(args: Subset<T, PostAggregateArgs>): Prisma.PrismaPromise<GetPostAggregateType<T>>

    /**
     * Group by Post.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PostGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends PostGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: PostGroupByArgs['orderBy'] }
        : { orderBy?: PostGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, PostGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetPostGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Post model
   */
  readonly fields: PostFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Post.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__PostClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    insight<T extends InsightDefaultArgs<ExtArgs> = {}>(args?: Subset<T, InsightDefaultArgs<ExtArgs>>): Prisma__InsightClient<$Result.GetResult<Prisma.$InsightPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    scheduledPosts<T extends Post$scheduledPostsArgs<ExtArgs> = {}>(args?: Subset<T, Post$scheduledPostsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ScheduledPostPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Post model
   */
  interface PostFieldRefs {
    readonly id: FieldRef<"Post", 'String'>
    readonly insightId: FieldRef<"Post", 'String'>
    readonly title: FieldRef<"Post", 'String'>
    readonly platform: FieldRef<"Post", 'String'>
    readonly content: FieldRef<"Post", 'String'>
    readonly status: FieldRef<"Post", 'String'>
    readonly characterCount: FieldRef<"Post", 'Int'>
    readonly createdAt: FieldRef<"Post", 'String'>
    readonly updatedAt: FieldRef<"Post", 'String'>
  }
    

  // Custom InputTypes
  /**
   * Post findUnique
   */
  export type PostFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Post
     */
    select?: PostSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Post
     */
    omit?: PostOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PostInclude<ExtArgs> | null
    /**
     * Filter, which Post to fetch.
     */
    where: PostWhereUniqueInput
  }

  /**
   * Post findUniqueOrThrow
   */
  export type PostFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Post
     */
    select?: PostSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Post
     */
    omit?: PostOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PostInclude<ExtArgs> | null
    /**
     * Filter, which Post to fetch.
     */
    where: PostWhereUniqueInput
  }

  /**
   * Post findFirst
   */
  export type PostFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Post
     */
    select?: PostSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Post
     */
    omit?: PostOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PostInclude<ExtArgs> | null
    /**
     * Filter, which Post to fetch.
     */
    where?: PostWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Posts to fetch.
     */
    orderBy?: PostOrderByWithRelationInput | PostOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Posts.
     */
    cursor?: PostWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Posts from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Posts.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Posts.
     */
    distinct?: PostScalarFieldEnum | PostScalarFieldEnum[]
  }

  /**
   * Post findFirstOrThrow
   */
  export type PostFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Post
     */
    select?: PostSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Post
     */
    omit?: PostOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PostInclude<ExtArgs> | null
    /**
     * Filter, which Post to fetch.
     */
    where?: PostWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Posts to fetch.
     */
    orderBy?: PostOrderByWithRelationInput | PostOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Posts.
     */
    cursor?: PostWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Posts from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Posts.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Posts.
     */
    distinct?: PostScalarFieldEnum | PostScalarFieldEnum[]
  }

  /**
   * Post findMany
   */
  export type PostFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Post
     */
    select?: PostSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Post
     */
    omit?: PostOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PostInclude<ExtArgs> | null
    /**
     * Filter, which Posts to fetch.
     */
    where?: PostWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Posts to fetch.
     */
    orderBy?: PostOrderByWithRelationInput | PostOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Posts.
     */
    cursor?: PostWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Posts from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Posts.
     */
    skip?: number
    distinct?: PostScalarFieldEnum | PostScalarFieldEnum[]
  }

  /**
   * Post create
   */
  export type PostCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Post
     */
    select?: PostSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Post
     */
    omit?: PostOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PostInclude<ExtArgs> | null
    /**
     * The data needed to create a Post.
     */
    data: XOR<PostCreateInput, PostUncheckedCreateInput>
  }

  /**
   * Post createMany
   */
  export type PostCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Posts.
     */
    data: PostCreateManyInput | PostCreateManyInput[]
  }

  /**
   * Post createManyAndReturn
   */
  export type PostCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Post
     */
    select?: PostSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Post
     */
    omit?: PostOmit<ExtArgs> | null
    /**
     * The data used to create many Posts.
     */
    data: PostCreateManyInput | PostCreateManyInput[]
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PostIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Post update
   */
  export type PostUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Post
     */
    select?: PostSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Post
     */
    omit?: PostOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PostInclude<ExtArgs> | null
    /**
     * The data needed to update a Post.
     */
    data: XOR<PostUpdateInput, PostUncheckedUpdateInput>
    /**
     * Choose, which Post to update.
     */
    where: PostWhereUniqueInput
  }

  /**
   * Post updateMany
   */
  export type PostUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Posts.
     */
    data: XOR<PostUpdateManyMutationInput, PostUncheckedUpdateManyInput>
    /**
     * Filter which Posts to update
     */
    where?: PostWhereInput
    /**
     * Limit how many Posts to update.
     */
    limit?: number
  }

  /**
   * Post updateManyAndReturn
   */
  export type PostUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Post
     */
    select?: PostSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Post
     */
    omit?: PostOmit<ExtArgs> | null
    /**
     * The data used to update Posts.
     */
    data: XOR<PostUpdateManyMutationInput, PostUncheckedUpdateManyInput>
    /**
     * Filter which Posts to update
     */
    where?: PostWhereInput
    /**
     * Limit how many Posts to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PostIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Post upsert
   */
  export type PostUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Post
     */
    select?: PostSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Post
     */
    omit?: PostOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PostInclude<ExtArgs> | null
    /**
     * The filter to search for the Post to update in case it exists.
     */
    where: PostWhereUniqueInput
    /**
     * In case the Post found by the `where` argument doesn't exist, create a new Post with this data.
     */
    create: XOR<PostCreateInput, PostUncheckedCreateInput>
    /**
     * In case the Post was found with the provided `where` argument, update it with this data.
     */
    update: XOR<PostUpdateInput, PostUncheckedUpdateInput>
  }

  /**
   * Post delete
   */
  export type PostDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Post
     */
    select?: PostSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Post
     */
    omit?: PostOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PostInclude<ExtArgs> | null
    /**
     * Filter which Post to delete.
     */
    where: PostWhereUniqueInput
  }

  /**
   * Post deleteMany
   */
  export type PostDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Posts to delete
     */
    where?: PostWhereInput
    /**
     * Limit how many Posts to delete.
     */
    limit?: number
  }

  /**
   * Post.scheduledPosts
   */
  export type Post$scheduledPostsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ScheduledPost
     */
    select?: ScheduledPostSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ScheduledPost
     */
    omit?: ScheduledPostOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ScheduledPostInclude<ExtArgs> | null
    where?: ScheduledPostWhereInput
    orderBy?: ScheduledPostOrderByWithRelationInput | ScheduledPostOrderByWithRelationInput[]
    cursor?: ScheduledPostWhereUniqueInput
    take?: number
    skip?: number
    distinct?: ScheduledPostScalarFieldEnum | ScheduledPostScalarFieldEnum[]
  }

  /**
   * Post without action
   */
  export type PostDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Post
     */
    select?: PostSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Post
     */
    omit?: PostOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PostInclude<ExtArgs> | null
  }


  /**
   * Model ScheduledPost
   */

  export type AggregateScheduledPost = {
    _count: ScheduledPostCountAggregateOutputType | null
    _avg: ScheduledPostAvgAggregateOutputType | null
    _sum: ScheduledPostSumAggregateOutputType | null
    _min: ScheduledPostMinAggregateOutputType | null
    _max: ScheduledPostMaxAggregateOutputType | null
  }

  export type ScheduledPostAvgAggregateOutputType = {
    retryCount: number | null
  }

  export type ScheduledPostSumAggregateOutputType = {
    retryCount: number | null
  }

  export type ScheduledPostMinAggregateOutputType = {
    id: string | null
    postId: string | null
    platform: string | null
    content: string | null
    scheduledTime: string | null
    status: string | null
    retryCount: number | null
    lastAttempt: string | null
    errorMessage: string | null
    externalPostId: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type ScheduledPostMaxAggregateOutputType = {
    id: string | null
    postId: string | null
    platform: string | null
    content: string | null
    scheduledTime: string | null
    status: string | null
    retryCount: number | null
    lastAttempt: string | null
    errorMessage: string | null
    externalPostId: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type ScheduledPostCountAggregateOutputType = {
    id: number
    postId: number
    platform: number
    content: number
    scheduledTime: number
    status: number
    retryCount: number
    lastAttempt: number
    errorMessage: number
    externalPostId: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type ScheduledPostAvgAggregateInputType = {
    retryCount?: true
  }

  export type ScheduledPostSumAggregateInputType = {
    retryCount?: true
  }

  export type ScheduledPostMinAggregateInputType = {
    id?: true
    postId?: true
    platform?: true
    content?: true
    scheduledTime?: true
    status?: true
    retryCount?: true
    lastAttempt?: true
    errorMessage?: true
    externalPostId?: true
    createdAt?: true
    updatedAt?: true
  }

  export type ScheduledPostMaxAggregateInputType = {
    id?: true
    postId?: true
    platform?: true
    content?: true
    scheduledTime?: true
    status?: true
    retryCount?: true
    lastAttempt?: true
    errorMessage?: true
    externalPostId?: true
    createdAt?: true
    updatedAt?: true
  }

  export type ScheduledPostCountAggregateInputType = {
    id?: true
    postId?: true
    platform?: true
    content?: true
    scheduledTime?: true
    status?: true
    retryCount?: true
    lastAttempt?: true
    errorMessage?: true
    externalPostId?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type ScheduledPostAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ScheduledPost to aggregate.
     */
    where?: ScheduledPostWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ScheduledPosts to fetch.
     */
    orderBy?: ScheduledPostOrderByWithRelationInput | ScheduledPostOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ScheduledPostWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ScheduledPosts from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ScheduledPosts.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned ScheduledPosts
    **/
    _count?: true | ScheduledPostCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: ScheduledPostAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: ScheduledPostSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ScheduledPostMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ScheduledPostMaxAggregateInputType
  }

  export type GetScheduledPostAggregateType<T extends ScheduledPostAggregateArgs> = {
        [P in keyof T & keyof AggregateScheduledPost]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateScheduledPost[P]>
      : GetScalarType<T[P], AggregateScheduledPost[P]>
  }




  export type ScheduledPostGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ScheduledPostWhereInput
    orderBy?: ScheduledPostOrderByWithAggregationInput | ScheduledPostOrderByWithAggregationInput[]
    by: ScheduledPostScalarFieldEnum[] | ScheduledPostScalarFieldEnum
    having?: ScheduledPostScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ScheduledPostCountAggregateInputType | true
    _avg?: ScheduledPostAvgAggregateInputType
    _sum?: ScheduledPostSumAggregateInputType
    _min?: ScheduledPostMinAggregateInputType
    _max?: ScheduledPostMaxAggregateInputType
  }

  export type ScheduledPostGroupByOutputType = {
    id: string
    postId: string
    platform: string
    content: string
    scheduledTime: string
    status: string
    retryCount: number
    lastAttempt: string | null
    errorMessage: string | null
    externalPostId: string | null
    createdAt: Date
    updatedAt: Date
    _count: ScheduledPostCountAggregateOutputType | null
    _avg: ScheduledPostAvgAggregateOutputType | null
    _sum: ScheduledPostSumAggregateOutputType | null
    _min: ScheduledPostMinAggregateOutputType | null
    _max: ScheduledPostMaxAggregateOutputType | null
  }

  type GetScheduledPostGroupByPayload<T extends ScheduledPostGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ScheduledPostGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ScheduledPostGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ScheduledPostGroupByOutputType[P]>
            : GetScalarType<T[P], ScheduledPostGroupByOutputType[P]>
        }
      >
    >


  export type ScheduledPostSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    postId?: boolean
    platform?: boolean
    content?: boolean
    scheduledTime?: boolean
    status?: boolean
    retryCount?: boolean
    lastAttempt?: boolean
    errorMessage?: boolean
    externalPostId?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    post?: boolean | PostDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["scheduledPost"]>

  export type ScheduledPostSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    postId?: boolean
    platform?: boolean
    content?: boolean
    scheduledTime?: boolean
    status?: boolean
    retryCount?: boolean
    lastAttempt?: boolean
    errorMessage?: boolean
    externalPostId?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    post?: boolean | PostDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["scheduledPost"]>

  export type ScheduledPostSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    postId?: boolean
    platform?: boolean
    content?: boolean
    scheduledTime?: boolean
    status?: boolean
    retryCount?: boolean
    lastAttempt?: boolean
    errorMessage?: boolean
    externalPostId?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    post?: boolean | PostDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["scheduledPost"]>

  export type ScheduledPostSelectScalar = {
    id?: boolean
    postId?: boolean
    platform?: boolean
    content?: boolean
    scheduledTime?: boolean
    status?: boolean
    retryCount?: boolean
    lastAttempt?: boolean
    errorMessage?: boolean
    externalPostId?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type ScheduledPostOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "postId" | "platform" | "content" | "scheduledTime" | "status" | "retryCount" | "lastAttempt" | "errorMessage" | "externalPostId" | "createdAt" | "updatedAt", ExtArgs["result"]["scheduledPost"]>
  export type ScheduledPostInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    post?: boolean | PostDefaultArgs<ExtArgs>
  }
  export type ScheduledPostIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    post?: boolean | PostDefaultArgs<ExtArgs>
  }
  export type ScheduledPostIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    post?: boolean | PostDefaultArgs<ExtArgs>
  }

  export type $ScheduledPostPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "ScheduledPost"
    objects: {
      post: Prisma.$PostPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      postId: string
      platform: string
      content: string
      scheduledTime: string
      status: string
      retryCount: number
      lastAttempt: string | null
      errorMessage: string | null
      externalPostId: string | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["scheduledPost"]>
    composites: {}
  }

  type ScheduledPostGetPayload<S extends boolean | null | undefined | ScheduledPostDefaultArgs> = $Result.GetResult<Prisma.$ScheduledPostPayload, S>

  type ScheduledPostCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<ScheduledPostFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: ScheduledPostCountAggregateInputType | true
    }

  export interface ScheduledPostDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['ScheduledPost'], meta: { name: 'ScheduledPost' } }
    /**
     * Find zero or one ScheduledPost that matches the filter.
     * @param {ScheduledPostFindUniqueArgs} args - Arguments to find a ScheduledPost
     * @example
     * // Get one ScheduledPost
     * const scheduledPost = await prisma.scheduledPost.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ScheduledPostFindUniqueArgs>(args: SelectSubset<T, ScheduledPostFindUniqueArgs<ExtArgs>>): Prisma__ScheduledPostClient<$Result.GetResult<Prisma.$ScheduledPostPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one ScheduledPost that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {ScheduledPostFindUniqueOrThrowArgs} args - Arguments to find a ScheduledPost
     * @example
     * // Get one ScheduledPost
     * const scheduledPost = await prisma.scheduledPost.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ScheduledPostFindUniqueOrThrowArgs>(args: SelectSubset<T, ScheduledPostFindUniqueOrThrowArgs<ExtArgs>>): Prisma__ScheduledPostClient<$Result.GetResult<Prisma.$ScheduledPostPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first ScheduledPost that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ScheduledPostFindFirstArgs} args - Arguments to find a ScheduledPost
     * @example
     * // Get one ScheduledPost
     * const scheduledPost = await prisma.scheduledPost.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ScheduledPostFindFirstArgs>(args?: SelectSubset<T, ScheduledPostFindFirstArgs<ExtArgs>>): Prisma__ScheduledPostClient<$Result.GetResult<Prisma.$ScheduledPostPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first ScheduledPost that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ScheduledPostFindFirstOrThrowArgs} args - Arguments to find a ScheduledPost
     * @example
     * // Get one ScheduledPost
     * const scheduledPost = await prisma.scheduledPost.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ScheduledPostFindFirstOrThrowArgs>(args?: SelectSubset<T, ScheduledPostFindFirstOrThrowArgs<ExtArgs>>): Prisma__ScheduledPostClient<$Result.GetResult<Prisma.$ScheduledPostPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more ScheduledPosts that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ScheduledPostFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all ScheduledPosts
     * const scheduledPosts = await prisma.scheduledPost.findMany()
     * 
     * // Get first 10 ScheduledPosts
     * const scheduledPosts = await prisma.scheduledPost.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const scheduledPostWithIdOnly = await prisma.scheduledPost.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends ScheduledPostFindManyArgs>(args?: SelectSubset<T, ScheduledPostFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ScheduledPostPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a ScheduledPost.
     * @param {ScheduledPostCreateArgs} args - Arguments to create a ScheduledPost.
     * @example
     * // Create one ScheduledPost
     * const ScheduledPost = await prisma.scheduledPost.create({
     *   data: {
     *     // ... data to create a ScheduledPost
     *   }
     * })
     * 
     */
    create<T extends ScheduledPostCreateArgs>(args: SelectSubset<T, ScheduledPostCreateArgs<ExtArgs>>): Prisma__ScheduledPostClient<$Result.GetResult<Prisma.$ScheduledPostPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many ScheduledPosts.
     * @param {ScheduledPostCreateManyArgs} args - Arguments to create many ScheduledPosts.
     * @example
     * // Create many ScheduledPosts
     * const scheduledPost = await prisma.scheduledPost.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends ScheduledPostCreateManyArgs>(args?: SelectSubset<T, ScheduledPostCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many ScheduledPosts and returns the data saved in the database.
     * @param {ScheduledPostCreateManyAndReturnArgs} args - Arguments to create many ScheduledPosts.
     * @example
     * // Create many ScheduledPosts
     * const scheduledPost = await prisma.scheduledPost.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many ScheduledPosts and only return the `id`
     * const scheduledPostWithIdOnly = await prisma.scheduledPost.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends ScheduledPostCreateManyAndReturnArgs>(args?: SelectSubset<T, ScheduledPostCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ScheduledPostPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a ScheduledPost.
     * @param {ScheduledPostDeleteArgs} args - Arguments to delete one ScheduledPost.
     * @example
     * // Delete one ScheduledPost
     * const ScheduledPost = await prisma.scheduledPost.delete({
     *   where: {
     *     // ... filter to delete one ScheduledPost
     *   }
     * })
     * 
     */
    delete<T extends ScheduledPostDeleteArgs>(args: SelectSubset<T, ScheduledPostDeleteArgs<ExtArgs>>): Prisma__ScheduledPostClient<$Result.GetResult<Prisma.$ScheduledPostPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one ScheduledPost.
     * @param {ScheduledPostUpdateArgs} args - Arguments to update one ScheduledPost.
     * @example
     * // Update one ScheduledPost
     * const scheduledPost = await prisma.scheduledPost.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends ScheduledPostUpdateArgs>(args: SelectSubset<T, ScheduledPostUpdateArgs<ExtArgs>>): Prisma__ScheduledPostClient<$Result.GetResult<Prisma.$ScheduledPostPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more ScheduledPosts.
     * @param {ScheduledPostDeleteManyArgs} args - Arguments to filter ScheduledPosts to delete.
     * @example
     * // Delete a few ScheduledPosts
     * const { count } = await prisma.scheduledPost.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends ScheduledPostDeleteManyArgs>(args?: SelectSubset<T, ScheduledPostDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ScheduledPosts.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ScheduledPostUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many ScheduledPosts
     * const scheduledPost = await prisma.scheduledPost.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends ScheduledPostUpdateManyArgs>(args: SelectSubset<T, ScheduledPostUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ScheduledPosts and returns the data updated in the database.
     * @param {ScheduledPostUpdateManyAndReturnArgs} args - Arguments to update many ScheduledPosts.
     * @example
     * // Update many ScheduledPosts
     * const scheduledPost = await prisma.scheduledPost.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more ScheduledPosts and only return the `id`
     * const scheduledPostWithIdOnly = await prisma.scheduledPost.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends ScheduledPostUpdateManyAndReturnArgs>(args: SelectSubset<T, ScheduledPostUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ScheduledPostPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one ScheduledPost.
     * @param {ScheduledPostUpsertArgs} args - Arguments to update or create a ScheduledPost.
     * @example
     * // Update or create a ScheduledPost
     * const scheduledPost = await prisma.scheduledPost.upsert({
     *   create: {
     *     // ... data to create a ScheduledPost
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the ScheduledPost we want to update
     *   }
     * })
     */
    upsert<T extends ScheduledPostUpsertArgs>(args: SelectSubset<T, ScheduledPostUpsertArgs<ExtArgs>>): Prisma__ScheduledPostClient<$Result.GetResult<Prisma.$ScheduledPostPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of ScheduledPosts.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ScheduledPostCountArgs} args - Arguments to filter ScheduledPosts to count.
     * @example
     * // Count the number of ScheduledPosts
     * const count = await prisma.scheduledPost.count({
     *   where: {
     *     // ... the filter for the ScheduledPosts we want to count
     *   }
     * })
    **/
    count<T extends ScheduledPostCountArgs>(
      args?: Subset<T, ScheduledPostCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ScheduledPostCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a ScheduledPost.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ScheduledPostAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends ScheduledPostAggregateArgs>(args: Subset<T, ScheduledPostAggregateArgs>): Prisma.PrismaPromise<GetScheduledPostAggregateType<T>>

    /**
     * Group by ScheduledPost.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ScheduledPostGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends ScheduledPostGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ScheduledPostGroupByArgs['orderBy'] }
        : { orderBy?: ScheduledPostGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, ScheduledPostGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetScheduledPostGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the ScheduledPost model
   */
  readonly fields: ScheduledPostFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for ScheduledPost.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ScheduledPostClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    post<T extends PostDefaultArgs<ExtArgs> = {}>(args?: Subset<T, PostDefaultArgs<ExtArgs>>): Prisma__PostClient<$Result.GetResult<Prisma.$PostPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the ScheduledPost model
   */
  interface ScheduledPostFieldRefs {
    readonly id: FieldRef<"ScheduledPost", 'String'>
    readonly postId: FieldRef<"ScheduledPost", 'String'>
    readonly platform: FieldRef<"ScheduledPost", 'String'>
    readonly content: FieldRef<"ScheduledPost", 'String'>
    readonly scheduledTime: FieldRef<"ScheduledPost", 'String'>
    readonly status: FieldRef<"ScheduledPost", 'String'>
    readonly retryCount: FieldRef<"ScheduledPost", 'Int'>
    readonly lastAttempt: FieldRef<"ScheduledPost", 'String'>
    readonly errorMessage: FieldRef<"ScheduledPost", 'String'>
    readonly externalPostId: FieldRef<"ScheduledPost", 'String'>
    readonly createdAt: FieldRef<"ScheduledPost", 'DateTime'>
    readonly updatedAt: FieldRef<"ScheduledPost", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * ScheduledPost findUnique
   */
  export type ScheduledPostFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ScheduledPost
     */
    select?: ScheduledPostSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ScheduledPost
     */
    omit?: ScheduledPostOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ScheduledPostInclude<ExtArgs> | null
    /**
     * Filter, which ScheduledPost to fetch.
     */
    where: ScheduledPostWhereUniqueInput
  }

  /**
   * ScheduledPost findUniqueOrThrow
   */
  export type ScheduledPostFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ScheduledPost
     */
    select?: ScheduledPostSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ScheduledPost
     */
    omit?: ScheduledPostOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ScheduledPostInclude<ExtArgs> | null
    /**
     * Filter, which ScheduledPost to fetch.
     */
    where: ScheduledPostWhereUniqueInput
  }

  /**
   * ScheduledPost findFirst
   */
  export type ScheduledPostFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ScheduledPost
     */
    select?: ScheduledPostSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ScheduledPost
     */
    omit?: ScheduledPostOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ScheduledPostInclude<ExtArgs> | null
    /**
     * Filter, which ScheduledPost to fetch.
     */
    where?: ScheduledPostWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ScheduledPosts to fetch.
     */
    orderBy?: ScheduledPostOrderByWithRelationInput | ScheduledPostOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ScheduledPosts.
     */
    cursor?: ScheduledPostWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ScheduledPosts from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ScheduledPosts.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ScheduledPosts.
     */
    distinct?: ScheduledPostScalarFieldEnum | ScheduledPostScalarFieldEnum[]
  }

  /**
   * ScheduledPost findFirstOrThrow
   */
  export type ScheduledPostFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ScheduledPost
     */
    select?: ScheduledPostSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ScheduledPost
     */
    omit?: ScheduledPostOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ScheduledPostInclude<ExtArgs> | null
    /**
     * Filter, which ScheduledPost to fetch.
     */
    where?: ScheduledPostWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ScheduledPosts to fetch.
     */
    orderBy?: ScheduledPostOrderByWithRelationInput | ScheduledPostOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ScheduledPosts.
     */
    cursor?: ScheduledPostWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ScheduledPosts from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ScheduledPosts.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ScheduledPosts.
     */
    distinct?: ScheduledPostScalarFieldEnum | ScheduledPostScalarFieldEnum[]
  }

  /**
   * ScheduledPost findMany
   */
  export type ScheduledPostFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ScheduledPost
     */
    select?: ScheduledPostSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ScheduledPost
     */
    omit?: ScheduledPostOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ScheduledPostInclude<ExtArgs> | null
    /**
     * Filter, which ScheduledPosts to fetch.
     */
    where?: ScheduledPostWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ScheduledPosts to fetch.
     */
    orderBy?: ScheduledPostOrderByWithRelationInput | ScheduledPostOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing ScheduledPosts.
     */
    cursor?: ScheduledPostWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ScheduledPosts from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ScheduledPosts.
     */
    skip?: number
    distinct?: ScheduledPostScalarFieldEnum | ScheduledPostScalarFieldEnum[]
  }

  /**
   * ScheduledPost create
   */
  export type ScheduledPostCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ScheduledPost
     */
    select?: ScheduledPostSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ScheduledPost
     */
    omit?: ScheduledPostOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ScheduledPostInclude<ExtArgs> | null
    /**
     * The data needed to create a ScheduledPost.
     */
    data: XOR<ScheduledPostCreateInput, ScheduledPostUncheckedCreateInput>
  }

  /**
   * ScheduledPost createMany
   */
  export type ScheduledPostCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many ScheduledPosts.
     */
    data: ScheduledPostCreateManyInput | ScheduledPostCreateManyInput[]
  }

  /**
   * ScheduledPost createManyAndReturn
   */
  export type ScheduledPostCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ScheduledPost
     */
    select?: ScheduledPostSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the ScheduledPost
     */
    omit?: ScheduledPostOmit<ExtArgs> | null
    /**
     * The data used to create many ScheduledPosts.
     */
    data: ScheduledPostCreateManyInput | ScheduledPostCreateManyInput[]
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ScheduledPostIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * ScheduledPost update
   */
  export type ScheduledPostUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ScheduledPost
     */
    select?: ScheduledPostSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ScheduledPost
     */
    omit?: ScheduledPostOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ScheduledPostInclude<ExtArgs> | null
    /**
     * The data needed to update a ScheduledPost.
     */
    data: XOR<ScheduledPostUpdateInput, ScheduledPostUncheckedUpdateInput>
    /**
     * Choose, which ScheduledPost to update.
     */
    where: ScheduledPostWhereUniqueInput
  }

  /**
   * ScheduledPost updateMany
   */
  export type ScheduledPostUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update ScheduledPosts.
     */
    data: XOR<ScheduledPostUpdateManyMutationInput, ScheduledPostUncheckedUpdateManyInput>
    /**
     * Filter which ScheduledPosts to update
     */
    where?: ScheduledPostWhereInput
    /**
     * Limit how many ScheduledPosts to update.
     */
    limit?: number
  }

  /**
   * ScheduledPost updateManyAndReturn
   */
  export type ScheduledPostUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ScheduledPost
     */
    select?: ScheduledPostSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the ScheduledPost
     */
    omit?: ScheduledPostOmit<ExtArgs> | null
    /**
     * The data used to update ScheduledPosts.
     */
    data: XOR<ScheduledPostUpdateManyMutationInput, ScheduledPostUncheckedUpdateManyInput>
    /**
     * Filter which ScheduledPosts to update
     */
    where?: ScheduledPostWhereInput
    /**
     * Limit how many ScheduledPosts to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ScheduledPostIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * ScheduledPost upsert
   */
  export type ScheduledPostUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ScheduledPost
     */
    select?: ScheduledPostSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ScheduledPost
     */
    omit?: ScheduledPostOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ScheduledPostInclude<ExtArgs> | null
    /**
     * The filter to search for the ScheduledPost to update in case it exists.
     */
    where: ScheduledPostWhereUniqueInput
    /**
     * In case the ScheduledPost found by the `where` argument doesn't exist, create a new ScheduledPost with this data.
     */
    create: XOR<ScheduledPostCreateInput, ScheduledPostUncheckedCreateInput>
    /**
     * In case the ScheduledPost was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ScheduledPostUpdateInput, ScheduledPostUncheckedUpdateInput>
  }

  /**
   * ScheduledPost delete
   */
  export type ScheduledPostDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ScheduledPost
     */
    select?: ScheduledPostSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ScheduledPost
     */
    omit?: ScheduledPostOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ScheduledPostInclude<ExtArgs> | null
    /**
     * Filter which ScheduledPost to delete.
     */
    where: ScheduledPostWhereUniqueInput
  }

  /**
   * ScheduledPost deleteMany
   */
  export type ScheduledPostDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ScheduledPosts to delete
     */
    where?: ScheduledPostWhereInput
    /**
     * Limit how many ScheduledPosts to delete.
     */
    limit?: number
  }

  /**
   * ScheduledPost without action
   */
  export type ScheduledPostDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ScheduledPost
     */
    select?: ScheduledPostSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ScheduledPost
     */
    omit?: ScheduledPostOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ScheduledPostInclude<ExtArgs> | null
  }


  /**
   * Model ProcessingJob
   */

  export type AggregateProcessingJob = {
    _count: ProcessingJobCountAggregateOutputType | null
    _avg: ProcessingJobAvgAggregateOutputType | null
    _sum: ProcessingJobSumAggregateOutputType | null
    _min: ProcessingJobMinAggregateOutputType | null
    _max: ProcessingJobMaxAggregateOutputType | null
  }

  export type ProcessingJobAvgAggregateOutputType = {
    progress: number | null
    resultCount: number | null
    durationMs: number | null
    estimatedTokens: number | null
    estimatedCost: number | null
  }

  export type ProcessingJobSumAggregateOutputType = {
    progress: number | null
    resultCount: number | null
    durationMs: number | null
    estimatedTokens: number | null
    estimatedCost: number | null
  }

  export type ProcessingJobMinAggregateOutputType = {
    id: string | null
    jobType: string | null
    sourceId: string | null
    status: string | null
    progress: number | null
    resultCount: number | null
    errorMessage: string | null
    startedAt: string | null
    completedAt: string | null
    durationMs: number | null
    estimatedTokens: number | null
    estimatedCost: number | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type ProcessingJobMaxAggregateOutputType = {
    id: string | null
    jobType: string | null
    sourceId: string | null
    status: string | null
    progress: number | null
    resultCount: number | null
    errorMessage: string | null
    startedAt: string | null
    completedAt: string | null
    durationMs: number | null
    estimatedTokens: number | null
    estimatedCost: number | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type ProcessingJobCountAggregateOutputType = {
    id: number
    jobType: number
    sourceId: number
    status: number
    progress: number
    resultCount: number
    errorMessage: number
    startedAt: number
    completedAt: number
    durationMs: number
    estimatedTokens: number
    estimatedCost: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type ProcessingJobAvgAggregateInputType = {
    progress?: true
    resultCount?: true
    durationMs?: true
    estimatedTokens?: true
    estimatedCost?: true
  }

  export type ProcessingJobSumAggregateInputType = {
    progress?: true
    resultCount?: true
    durationMs?: true
    estimatedTokens?: true
    estimatedCost?: true
  }

  export type ProcessingJobMinAggregateInputType = {
    id?: true
    jobType?: true
    sourceId?: true
    status?: true
    progress?: true
    resultCount?: true
    errorMessage?: true
    startedAt?: true
    completedAt?: true
    durationMs?: true
    estimatedTokens?: true
    estimatedCost?: true
    createdAt?: true
    updatedAt?: true
  }

  export type ProcessingJobMaxAggregateInputType = {
    id?: true
    jobType?: true
    sourceId?: true
    status?: true
    progress?: true
    resultCount?: true
    errorMessage?: true
    startedAt?: true
    completedAt?: true
    durationMs?: true
    estimatedTokens?: true
    estimatedCost?: true
    createdAt?: true
    updatedAt?: true
  }

  export type ProcessingJobCountAggregateInputType = {
    id?: true
    jobType?: true
    sourceId?: true
    status?: true
    progress?: true
    resultCount?: true
    errorMessage?: true
    startedAt?: true
    completedAt?: true
    durationMs?: true
    estimatedTokens?: true
    estimatedCost?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type ProcessingJobAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ProcessingJob to aggregate.
     */
    where?: ProcessingJobWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ProcessingJobs to fetch.
     */
    orderBy?: ProcessingJobOrderByWithRelationInput | ProcessingJobOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ProcessingJobWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ProcessingJobs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ProcessingJobs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned ProcessingJobs
    **/
    _count?: true | ProcessingJobCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: ProcessingJobAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: ProcessingJobSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ProcessingJobMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ProcessingJobMaxAggregateInputType
  }

  export type GetProcessingJobAggregateType<T extends ProcessingJobAggregateArgs> = {
        [P in keyof T & keyof AggregateProcessingJob]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateProcessingJob[P]>
      : GetScalarType<T[P], AggregateProcessingJob[P]>
  }




  export type ProcessingJobGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ProcessingJobWhereInput
    orderBy?: ProcessingJobOrderByWithAggregationInput | ProcessingJobOrderByWithAggregationInput[]
    by: ProcessingJobScalarFieldEnum[] | ProcessingJobScalarFieldEnum
    having?: ProcessingJobScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ProcessingJobCountAggregateInputType | true
    _avg?: ProcessingJobAvgAggregateInputType
    _sum?: ProcessingJobSumAggregateInputType
    _min?: ProcessingJobMinAggregateInputType
    _max?: ProcessingJobMaxAggregateInputType
  }

  export type ProcessingJobGroupByOutputType = {
    id: string
    jobType: string
    sourceId: string
    status: string
    progress: number
    resultCount: number
    errorMessage: string | null
    startedAt: string | null
    completedAt: string | null
    durationMs: number | null
    estimatedTokens: number | null
    estimatedCost: number | null
    createdAt: Date
    updatedAt: Date
    _count: ProcessingJobCountAggregateOutputType | null
    _avg: ProcessingJobAvgAggregateOutputType | null
    _sum: ProcessingJobSumAggregateOutputType | null
    _min: ProcessingJobMinAggregateOutputType | null
    _max: ProcessingJobMaxAggregateOutputType | null
  }

  type GetProcessingJobGroupByPayload<T extends ProcessingJobGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ProcessingJobGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ProcessingJobGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ProcessingJobGroupByOutputType[P]>
            : GetScalarType<T[P], ProcessingJobGroupByOutputType[P]>
        }
      >
    >


  export type ProcessingJobSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    jobType?: boolean
    sourceId?: boolean
    status?: boolean
    progress?: boolean
    resultCount?: boolean
    errorMessage?: boolean
    startedAt?: boolean
    completedAt?: boolean
    durationMs?: boolean
    estimatedTokens?: boolean
    estimatedCost?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["processingJob"]>

  export type ProcessingJobSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    jobType?: boolean
    sourceId?: boolean
    status?: boolean
    progress?: boolean
    resultCount?: boolean
    errorMessage?: boolean
    startedAt?: boolean
    completedAt?: boolean
    durationMs?: boolean
    estimatedTokens?: boolean
    estimatedCost?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["processingJob"]>

  export type ProcessingJobSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    jobType?: boolean
    sourceId?: boolean
    status?: boolean
    progress?: boolean
    resultCount?: boolean
    errorMessage?: boolean
    startedAt?: boolean
    completedAt?: boolean
    durationMs?: boolean
    estimatedTokens?: boolean
    estimatedCost?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["processingJob"]>

  export type ProcessingJobSelectScalar = {
    id?: boolean
    jobType?: boolean
    sourceId?: boolean
    status?: boolean
    progress?: boolean
    resultCount?: boolean
    errorMessage?: boolean
    startedAt?: boolean
    completedAt?: boolean
    durationMs?: boolean
    estimatedTokens?: boolean
    estimatedCost?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type ProcessingJobOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "jobType" | "sourceId" | "status" | "progress" | "resultCount" | "errorMessage" | "startedAt" | "completedAt" | "durationMs" | "estimatedTokens" | "estimatedCost" | "createdAt" | "updatedAt", ExtArgs["result"]["processingJob"]>

  export type $ProcessingJobPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "ProcessingJob"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: string
      jobType: string
      sourceId: string
      status: string
      progress: number
      resultCount: number
      errorMessage: string | null
      startedAt: string | null
      completedAt: string | null
      durationMs: number | null
      estimatedTokens: number | null
      estimatedCost: number | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["processingJob"]>
    composites: {}
  }

  type ProcessingJobGetPayload<S extends boolean | null | undefined | ProcessingJobDefaultArgs> = $Result.GetResult<Prisma.$ProcessingJobPayload, S>

  type ProcessingJobCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<ProcessingJobFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: ProcessingJobCountAggregateInputType | true
    }

  export interface ProcessingJobDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['ProcessingJob'], meta: { name: 'ProcessingJob' } }
    /**
     * Find zero or one ProcessingJob that matches the filter.
     * @param {ProcessingJobFindUniqueArgs} args - Arguments to find a ProcessingJob
     * @example
     * // Get one ProcessingJob
     * const processingJob = await prisma.processingJob.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ProcessingJobFindUniqueArgs>(args: SelectSubset<T, ProcessingJobFindUniqueArgs<ExtArgs>>): Prisma__ProcessingJobClient<$Result.GetResult<Prisma.$ProcessingJobPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one ProcessingJob that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {ProcessingJobFindUniqueOrThrowArgs} args - Arguments to find a ProcessingJob
     * @example
     * // Get one ProcessingJob
     * const processingJob = await prisma.processingJob.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ProcessingJobFindUniqueOrThrowArgs>(args: SelectSubset<T, ProcessingJobFindUniqueOrThrowArgs<ExtArgs>>): Prisma__ProcessingJobClient<$Result.GetResult<Prisma.$ProcessingJobPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first ProcessingJob that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProcessingJobFindFirstArgs} args - Arguments to find a ProcessingJob
     * @example
     * // Get one ProcessingJob
     * const processingJob = await prisma.processingJob.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ProcessingJobFindFirstArgs>(args?: SelectSubset<T, ProcessingJobFindFirstArgs<ExtArgs>>): Prisma__ProcessingJobClient<$Result.GetResult<Prisma.$ProcessingJobPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first ProcessingJob that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProcessingJobFindFirstOrThrowArgs} args - Arguments to find a ProcessingJob
     * @example
     * // Get one ProcessingJob
     * const processingJob = await prisma.processingJob.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ProcessingJobFindFirstOrThrowArgs>(args?: SelectSubset<T, ProcessingJobFindFirstOrThrowArgs<ExtArgs>>): Prisma__ProcessingJobClient<$Result.GetResult<Prisma.$ProcessingJobPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more ProcessingJobs that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProcessingJobFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all ProcessingJobs
     * const processingJobs = await prisma.processingJob.findMany()
     * 
     * // Get first 10 ProcessingJobs
     * const processingJobs = await prisma.processingJob.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const processingJobWithIdOnly = await prisma.processingJob.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends ProcessingJobFindManyArgs>(args?: SelectSubset<T, ProcessingJobFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ProcessingJobPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a ProcessingJob.
     * @param {ProcessingJobCreateArgs} args - Arguments to create a ProcessingJob.
     * @example
     * // Create one ProcessingJob
     * const ProcessingJob = await prisma.processingJob.create({
     *   data: {
     *     // ... data to create a ProcessingJob
     *   }
     * })
     * 
     */
    create<T extends ProcessingJobCreateArgs>(args: SelectSubset<T, ProcessingJobCreateArgs<ExtArgs>>): Prisma__ProcessingJobClient<$Result.GetResult<Prisma.$ProcessingJobPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many ProcessingJobs.
     * @param {ProcessingJobCreateManyArgs} args - Arguments to create many ProcessingJobs.
     * @example
     * // Create many ProcessingJobs
     * const processingJob = await prisma.processingJob.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends ProcessingJobCreateManyArgs>(args?: SelectSubset<T, ProcessingJobCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many ProcessingJobs and returns the data saved in the database.
     * @param {ProcessingJobCreateManyAndReturnArgs} args - Arguments to create many ProcessingJobs.
     * @example
     * // Create many ProcessingJobs
     * const processingJob = await prisma.processingJob.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many ProcessingJobs and only return the `id`
     * const processingJobWithIdOnly = await prisma.processingJob.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends ProcessingJobCreateManyAndReturnArgs>(args?: SelectSubset<T, ProcessingJobCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ProcessingJobPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a ProcessingJob.
     * @param {ProcessingJobDeleteArgs} args - Arguments to delete one ProcessingJob.
     * @example
     * // Delete one ProcessingJob
     * const ProcessingJob = await prisma.processingJob.delete({
     *   where: {
     *     // ... filter to delete one ProcessingJob
     *   }
     * })
     * 
     */
    delete<T extends ProcessingJobDeleteArgs>(args: SelectSubset<T, ProcessingJobDeleteArgs<ExtArgs>>): Prisma__ProcessingJobClient<$Result.GetResult<Prisma.$ProcessingJobPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one ProcessingJob.
     * @param {ProcessingJobUpdateArgs} args - Arguments to update one ProcessingJob.
     * @example
     * // Update one ProcessingJob
     * const processingJob = await prisma.processingJob.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends ProcessingJobUpdateArgs>(args: SelectSubset<T, ProcessingJobUpdateArgs<ExtArgs>>): Prisma__ProcessingJobClient<$Result.GetResult<Prisma.$ProcessingJobPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more ProcessingJobs.
     * @param {ProcessingJobDeleteManyArgs} args - Arguments to filter ProcessingJobs to delete.
     * @example
     * // Delete a few ProcessingJobs
     * const { count } = await prisma.processingJob.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends ProcessingJobDeleteManyArgs>(args?: SelectSubset<T, ProcessingJobDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ProcessingJobs.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProcessingJobUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many ProcessingJobs
     * const processingJob = await prisma.processingJob.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends ProcessingJobUpdateManyArgs>(args: SelectSubset<T, ProcessingJobUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ProcessingJobs and returns the data updated in the database.
     * @param {ProcessingJobUpdateManyAndReturnArgs} args - Arguments to update many ProcessingJobs.
     * @example
     * // Update many ProcessingJobs
     * const processingJob = await prisma.processingJob.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more ProcessingJobs and only return the `id`
     * const processingJobWithIdOnly = await prisma.processingJob.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends ProcessingJobUpdateManyAndReturnArgs>(args: SelectSubset<T, ProcessingJobUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ProcessingJobPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one ProcessingJob.
     * @param {ProcessingJobUpsertArgs} args - Arguments to update or create a ProcessingJob.
     * @example
     * // Update or create a ProcessingJob
     * const processingJob = await prisma.processingJob.upsert({
     *   create: {
     *     // ... data to create a ProcessingJob
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the ProcessingJob we want to update
     *   }
     * })
     */
    upsert<T extends ProcessingJobUpsertArgs>(args: SelectSubset<T, ProcessingJobUpsertArgs<ExtArgs>>): Prisma__ProcessingJobClient<$Result.GetResult<Prisma.$ProcessingJobPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of ProcessingJobs.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProcessingJobCountArgs} args - Arguments to filter ProcessingJobs to count.
     * @example
     * // Count the number of ProcessingJobs
     * const count = await prisma.processingJob.count({
     *   where: {
     *     // ... the filter for the ProcessingJobs we want to count
     *   }
     * })
    **/
    count<T extends ProcessingJobCountArgs>(
      args?: Subset<T, ProcessingJobCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ProcessingJobCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a ProcessingJob.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProcessingJobAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends ProcessingJobAggregateArgs>(args: Subset<T, ProcessingJobAggregateArgs>): Prisma.PrismaPromise<GetProcessingJobAggregateType<T>>

    /**
     * Group by ProcessingJob.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProcessingJobGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends ProcessingJobGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ProcessingJobGroupByArgs['orderBy'] }
        : { orderBy?: ProcessingJobGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, ProcessingJobGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetProcessingJobGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the ProcessingJob model
   */
  readonly fields: ProcessingJobFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for ProcessingJob.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ProcessingJobClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the ProcessingJob model
   */
  interface ProcessingJobFieldRefs {
    readonly id: FieldRef<"ProcessingJob", 'String'>
    readonly jobType: FieldRef<"ProcessingJob", 'String'>
    readonly sourceId: FieldRef<"ProcessingJob", 'String'>
    readonly status: FieldRef<"ProcessingJob", 'String'>
    readonly progress: FieldRef<"ProcessingJob", 'Int'>
    readonly resultCount: FieldRef<"ProcessingJob", 'Int'>
    readonly errorMessage: FieldRef<"ProcessingJob", 'String'>
    readonly startedAt: FieldRef<"ProcessingJob", 'String'>
    readonly completedAt: FieldRef<"ProcessingJob", 'String'>
    readonly durationMs: FieldRef<"ProcessingJob", 'Int'>
    readonly estimatedTokens: FieldRef<"ProcessingJob", 'Int'>
    readonly estimatedCost: FieldRef<"ProcessingJob", 'Float'>
    readonly createdAt: FieldRef<"ProcessingJob", 'DateTime'>
    readonly updatedAt: FieldRef<"ProcessingJob", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * ProcessingJob findUnique
   */
  export type ProcessingJobFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProcessingJob
     */
    select?: ProcessingJobSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProcessingJob
     */
    omit?: ProcessingJobOmit<ExtArgs> | null
    /**
     * Filter, which ProcessingJob to fetch.
     */
    where: ProcessingJobWhereUniqueInput
  }

  /**
   * ProcessingJob findUniqueOrThrow
   */
  export type ProcessingJobFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProcessingJob
     */
    select?: ProcessingJobSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProcessingJob
     */
    omit?: ProcessingJobOmit<ExtArgs> | null
    /**
     * Filter, which ProcessingJob to fetch.
     */
    where: ProcessingJobWhereUniqueInput
  }

  /**
   * ProcessingJob findFirst
   */
  export type ProcessingJobFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProcessingJob
     */
    select?: ProcessingJobSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProcessingJob
     */
    omit?: ProcessingJobOmit<ExtArgs> | null
    /**
     * Filter, which ProcessingJob to fetch.
     */
    where?: ProcessingJobWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ProcessingJobs to fetch.
     */
    orderBy?: ProcessingJobOrderByWithRelationInput | ProcessingJobOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ProcessingJobs.
     */
    cursor?: ProcessingJobWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ProcessingJobs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ProcessingJobs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ProcessingJobs.
     */
    distinct?: ProcessingJobScalarFieldEnum | ProcessingJobScalarFieldEnum[]
  }

  /**
   * ProcessingJob findFirstOrThrow
   */
  export type ProcessingJobFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProcessingJob
     */
    select?: ProcessingJobSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProcessingJob
     */
    omit?: ProcessingJobOmit<ExtArgs> | null
    /**
     * Filter, which ProcessingJob to fetch.
     */
    where?: ProcessingJobWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ProcessingJobs to fetch.
     */
    orderBy?: ProcessingJobOrderByWithRelationInput | ProcessingJobOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ProcessingJobs.
     */
    cursor?: ProcessingJobWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ProcessingJobs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ProcessingJobs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ProcessingJobs.
     */
    distinct?: ProcessingJobScalarFieldEnum | ProcessingJobScalarFieldEnum[]
  }

  /**
   * ProcessingJob findMany
   */
  export type ProcessingJobFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProcessingJob
     */
    select?: ProcessingJobSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProcessingJob
     */
    omit?: ProcessingJobOmit<ExtArgs> | null
    /**
     * Filter, which ProcessingJobs to fetch.
     */
    where?: ProcessingJobWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ProcessingJobs to fetch.
     */
    orderBy?: ProcessingJobOrderByWithRelationInput | ProcessingJobOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing ProcessingJobs.
     */
    cursor?: ProcessingJobWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ProcessingJobs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ProcessingJobs.
     */
    skip?: number
    distinct?: ProcessingJobScalarFieldEnum | ProcessingJobScalarFieldEnum[]
  }

  /**
   * ProcessingJob create
   */
  export type ProcessingJobCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProcessingJob
     */
    select?: ProcessingJobSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProcessingJob
     */
    omit?: ProcessingJobOmit<ExtArgs> | null
    /**
     * The data needed to create a ProcessingJob.
     */
    data: XOR<ProcessingJobCreateInput, ProcessingJobUncheckedCreateInput>
  }

  /**
   * ProcessingJob createMany
   */
  export type ProcessingJobCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many ProcessingJobs.
     */
    data: ProcessingJobCreateManyInput | ProcessingJobCreateManyInput[]
  }

  /**
   * ProcessingJob createManyAndReturn
   */
  export type ProcessingJobCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProcessingJob
     */
    select?: ProcessingJobSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the ProcessingJob
     */
    omit?: ProcessingJobOmit<ExtArgs> | null
    /**
     * The data used to create many ProcessingJobs.
     */
    data: ProcessingJobCreateManyInput | ProcessingJobCreateManyInput[]
  }

  /**
   * ProcessingJob update
   */
  export type ProcessingJobUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProcessingJob
     */
    select?: ProcessingJobSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProcessingJob
     */
    omit?: ProcessingJobOmit<ExtArgs> | null
    /**
     * The data needed to update a ProcessingJob.
     */
    data: XOR<ProcessingJobUpdateInput, ProcessingJobUncheckedUpdateInput>
    /**
     * Choose, which ProcessingJob to update.
     */
    where: ProcessingJobWhereUniqueInput
  }

  /**
   * ProcessingJob updateMany
   */
  export type ProcessingJobUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update ProcessingJobs.
     */
    data: XOR<ProcessingJobUpdateManyMutationInput, ProcessingJobUncheckedUpdateManyInput>
    /**
     * Filter which ProcessingJobs to update
     */
    where?: ProcessingJobWhereInput
    /**
     * Limit how many ProcessingJobs to update.
     */
    limit?: number
  }

  /**
   * ProcessingJob updateManyAndReturn
   */
  export type ProcessingJobUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProcessingJob
     */
    select?: ProcessingJobSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the ProcessingJob
     */
    omit?: ProcessingJobOmit<ExtArgs> | null
    /**
     * The data used to update ProcessingJobs.
     */
    data: XOR<ProcessingJobUpdateManyMutationInput, ProcessingJobUncheckedUpdateManyInput>
    /**
     * Filter which ProcessingJobs to update
     */
    where?: ProcessingJobWhereInput
    /**
     * Limit how many ProcessingJobs to update.
     */
    limit?: number
  }

  /**
   * ProcessingJob upsert
   */
  export type ProcessingJobUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProcessingJob
     */
    select?: ProcessingJobSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProcessingJob
     */
    omit?: ProcessingJobOmit<ExtArgs> | null
    /**
     * The filter to search for the ProcessingJob to update in case it exists.
     */
    where: ProcessingJobWhereUniqueInput
    /**
     * In case the ProcessingJob found by the `where` argument doesn't exist, create a new ProcessingJob with this data.
     */
    create: XOR<ProcessingJobCreateInput, ProcessingJobUncheckedCreateInput>
    /**
     * In case the ProcessingJob was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ProcessingJobUpdateInput, ProcessingJobUncheckedUpdateInput>
  }

  /**
   * ProcessingJob delete
   */
  export type ProcessingJobDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProcessingJob
     */
    select?: ProcessingJobSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProcessingJob
     */
    omit?: ProcessingJobOmit<ExtArgs> | null
    /**
     * Filter which ProcessingJob to delete.
     */
    where: ProcessingJobWhereUniqueInput
  }

  /**
   * ProcessingJob deleteMany
   */
  export type ProcessingJobDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ProcessingJobs to delete
     */
    where?: ProcessingJobWhereInput
    /**
     * Limit how many ProcessingJobs to delete.
     */
    limit?: number
  }

  /**
   * ProcessingJob without action
   */
  export type ProcessingJobDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProcessingJob
     */
    select?: ProcessingJobSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProcessingJob
     */
    omit?: ProcessingJobOmit<ExtArgs> | null
  }


  /**
   * Model Setting
   */

  export type AggregateSetting = {
    _count: SettingCountAggregateOutputType | null
    _min: SettingMinAggregateOutputType | null
    _max: SettingMaxAggregateOutputType | null
  }

  export type SettingMinAggregateOutputType = {
    key: string | null
    value: string | null
    category: string | null
    description: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type SettingMaxAggregateOutputType = {
    key: string | null
    value: string | null
    category: string | null
    description: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type SettingCountAggregateOutputType = {
    key: number
    value: number
    category: number
    description: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type SettingMinAggregateInputType = {
    key?: true
    value?: true
    category?: true
    description?: true
    createdAt?: true
    updatedAt?: true
  }

  export type SettingMaxAggregateInputType = {
    key?: true
    value?: true
    category?: true
    description?: true
    createdAt?: true
    updatedAt?: true
  }

  export type SettingCountAggregateInputType = {
    key?: true
    value?: true
    category?: true
    description?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type SettingAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Setting to aggregate.
     */
    where?: SettingWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Settings to fetch.
     */
    orderBy?: SettingOrderByWithRelationInput | SettingOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: SettingWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Settings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Settings.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Settings
    **/
    _count?: true | SettingCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: SettingMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: SettingMaxAggregateInputType
  }

  export type GetSettingAggregateType<T extends SettingAggregateArgs> = {
        [P in keyof T & keyof AggregateSetting]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateSetting[P]>
      : GetScalarType<T[P], AggregateSetting[P]>
  }




  export type SettingGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: SettingWhereInput
    orderBy?: SettingOrderByWithAggregationInput | SettingOrderByWithAggregationInput[]
    by: SettingScalarFieldEnum[] | SettingScalarFieldEnum
    having?: SettingScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: SettingCountAggregateInputType | true
    _min?: SettingMinAggregateInputType
    _max?: SettingMaxAggregateInputType
  }

  export type SettingGroupByOutputType = {
    key: string
    value: string
    category: string
    description: string | null
    createdAt: Date
    updatedAt: Date
    _count: SettingCountAggregateOutputType | null
    _min: SettingMinAggregateOutputType | null
    _max: SettingMaxAggregateOutputType | null
  }

  type GetSettingGroupByPayload<T extends SettingGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<SettingGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof SettingGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], SettingGroupByOutputType[P]>
            : GetScalarType<T[P], SettingGroupByOutputType[P]>
        }
      >
    >


  export type SettingSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    key?: boolean
    value?: boolean
    category?: boolean
    description?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["setting"]>

  export type SettingSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    key?: boolean
    value?: boolean
    category?: boolean
    description?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["setting"]>

  export type SettingSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    key?: boolean
    value?: boolean
    category?: boolean
    description?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["setting"]>

  export type SettingSelectScalar = {
    key?: boolean
    value?: boolean
    category?: boolean
    description?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type SettingOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"key" | "value" | "category" | "description" | "createdAt" | "updatedAt", ExtArgs["result"]["setting"]>

  export type $SettingPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Setting"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      key: string
      value: string
      category: string
      description: string | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["setting"]>
    composites: {}
  }

  type SettingGetPayload<S extends boolean | null | undefined | SettingDefaultArgs> = $Result.GetResult<Prisma.$SettingPayload, S>

  type SettingCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<SettingFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: SettingCountAggregateInputType | true
    }

  export interface SettingDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Setting'], meta: { name: 'Setting' } }
    /**
     * Find zero or one Setting that matches the filter.
     * @param {SettingFindUniqueArgs} args - Arguments to find a Setting
     * @example
     * // Get one Setting
     * const setting = await prisma.setting.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends SettingFindUniqueArgs>(args: SelectSubset<T, SettingFindUniqueArgs<ExtArgs>>): Prisma__SettingClient<$Result.GetResult<Prisma.$SettingPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Setting that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {SettingFindUniqueOrThrowArgs} args - Arguments to find a Setting
     * @example
     * // Get one Setting
     * const setting = await prisma.setting.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends SettingFindUniqueOrThrowArgs>(args: SelectSubset<T, SettingFindUniqueOrThrowArgs<ExtArgs>>): Prisma__SettingClient<$Result.GetResult<Prisma.$SettingPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Setting that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SettingFindFirstArgs} args - Arguments to find a Setting
     * @example
     * // Get one Setting
     * const setting = await prisma.setting.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends SettingFindFirstArgs>(args?: SelectSubset<T, SettingFindFirstArgs<ExtArgs>>): Prisma__SettingClient<$Result.GetResult<Prisma.$SettingPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Setting that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SettingFindFirstOrThrowArgs} args - Arguments to find a Setting
     * @example
     * // Get one Setting
     * const setting = await prisma.setting.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends SettingFindFirstOrThrowArgs>(args?: SelectSubset<T, SettingFindFirstOrThrowArgs<ExtArgs>>): Prisma__SettingClient<$Result.GetResult<Prisma.$SettingPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Settings that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SettingFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Settings
     * const settings = await prisma.setting.findMany()
     * 
     * // Get first 10 Settings
     * const settings = await prisma.setting.findMany({ take: 10 })
     * 
     * // Only select the `key`
     * const settingWithKeyOnly = await prisma.setting.findMany({ select: { key: true } })
     * 
     */
    findMany<T extends SettingFindManyArgs>(args?: SelectSubset<T, SettingFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SettingPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Setting.
     * @param {SettingCreateArgs} args - Arguments to create a Setting.
     * @example
     * // Create one Setting
     * const Setting = await prisma.setting.create({
     *   data: {
     *     // ... data to create a Setting
     *   }
     * })
     * 
     */
    create<T extends SettingCreateArgs>(args: SelectSubset<T, SettingCreateArgs<ExtArgs>>): Prisma__SettingClient<$Result.GetResult<Prisma.$SettingPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Settings.
     * @param {SettingCreateManyArgs} args - Arguments to create many Settings.
     * @example
     * // Create many Settings
     * const setting = await prisma.setting.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends SettingCreateManyArgs>(args?: SelectSubset<T, SettingCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Settings and returns the data saved in the database.
     * @param {SettingCreateManyAndReturnArgs} args - Arguments to create many Settings.
     * @example
     * // Create many Settings
     * const setting = await prisma.setting.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Settings and only return the `key`
     * const settingWithKeyOnly = await prisma.setting.createManyAndReturn({
     *   select: { key: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends SettingCreateManyAndReturnArgs>(args?: SelectSubset<T, SettingCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SettingPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Setting.
     * @param {SettingDeleteArgs} args - Arguments to delete one Setting.
     * @example
     * // Delete one Setting
     * const Setting = await prisma.setting.delete({
     *   where: {
     *     // ... filter to delete one Setting
     *   }
     * })
     * 
     */
    delete<T extends SettingDeleteArgs>(args: SelectSubset<T, SettingDeleteArgs<ExtArgs>>): Prisma__SettingClient<$Result.GetResult<Prisma.$SettingPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Setting.
     * @param {SettingUpdateArgs} args - Arguments to update one Setting.
     * @example
     * // Update one Setting
     * const setting = await prisma.setting.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends SettingUpdateArgs>(args: SelectSubset<T, SettingUpdateArgs<ExtArgs>>): Prisma__SettingClient<$Result.GetResult<Prisma.$SettingPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Settings.
     * @param {SettingDeleteManyArgs} args - Arguments to filter Settings to delete.
     * @example
     * // Delete a few Settings
     * const { count } = await prisma.setting.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends SettingDeleteManyArgs>(args?: SelectSubset<T, SettingDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Settings.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SettingUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Settings
     * const setting = await prisma.setting.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends SettingUpdateManyArgs>(args: SelectSubset<T, SettingUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Settings and returns the data updated in the database.
     * @param {SettingUpdateManyAndReturnArgs} args - Arguments to update many Settings.
     * @example
     * // Update many Settings
     * const setting = await prisma.setting.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Settings and only return the `key`
     * const settingWithKeyOnly = await prisma.setting.updateManyAndReturn({
     *   select: { key: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends SettingUpdateManyAndReturnArgs>(args: SelectSubset<T, SettingUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SettingPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Setting.
     * @param {SettingUpsertArgs} args - Arguments to update or create a Setting.
     * @example
     * // Update or create a Setting
     * const setting = await prisma.setting.upsert({
     *   create: {
     *     // ... data to create a Setting
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Setting we want to update
     *   }
     * })
     */
    upsert<T extends SettingUpsertArgs>(args: SelectSubset<T, SettingUpsertArgs<ExtArgs>>): Prisma__SettingClient<$Result.GetResult<Prisma.$SettingPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Settings.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SettingCountArgs} args - Arguments to filter Settings to count.
     * @example
     * // Count the number of Settings
     * const count = await prisma.setting.count({
     *   where: {
     *     // ... the filter for the Settings we want to count
     *   }
     * })
    **/
    count<T extends SettingCountArgs>(
      args?: Subset<T, SettingCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], SettingCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Setting.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SettingAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends SettingAggregateArgs>(args: Subset<T, SettingAggregateArgs>): Prisma.PrismaPromise<GetSettingAggregateType<T>>

    /**
     * Group by Setting.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SettingGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends SettingGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: SettingGroupByArgs['orderBy'] }
        : { orderBy?: SettingGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, SettingGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetSettingGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Setting model
   */
  readonly fields: SettingFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Setting.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__SettingClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Setting model
   */
  interface SettingFieldRefs {
    readonly key: FieldRef<"Setting", 'String'>
    readonly value: FieldRef<"Setting", 'String'>
    readonly category: FieldRef<"Setting", 'String'>
    readonly description: FieldRef<"Setting", 'String'>
    readonly createdAt: FieldRef<"Setting", 'DateTime'>
    readonly updatedAt: FieldRef<"Setting", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Setting findUnique
   */
  export type SettingFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Setting
     */
    select?: SettingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Setting
     */
    omit?: SettingOmit<ExtArgs> | null
    /**
     * Filter, which Setting to fetch.
     */
    where: SettingWhereUniqueInput
  }

  /**
   * Setting findUniqueOrThrow
   */
  export type SettingFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Setting
     */
    select?: SettingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Setting
     */
    omit?: SettingOmit<ExtArgs> | null
    /**
     * Filter, which Setting to fetch.
     */
    where: SettingWhereUniqueInput
  }

  /**
   * Setting findFirst
   */
  export type SettingFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Setting
     */
    select?: SettingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Setting
     */
    omit?: SettingOmit<ExtArgs> | null
    /**
     * Filter, which Setting to fetch.
     */
    where?: SettingWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Settings to fetch.
     */
    orderBy?: SettingOrderByWithRelationInput | SettingOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Settings.
     */
    cursor?: SettingWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Settings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Settings.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Settings.
     */
    distinct?: SettingScalarFieldEnum | SettingScalarFieldEnum[]
  }

  /**
   * Setting findFirstOrThrow
   */
  export type SettingFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Setting
     */
    select?: SettingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Setting
     */
    omit?: SettingOmit<ExtArgs> | null
    /**
     * Filter, which Setting to fetch.
     */
    where?: SettingWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Settings to fetch.
     */
    orderBy?: SettingOrderByWithRelationInput | SettingOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Settings.
     */
    cursor?: SettingWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Settings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Settings.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Settings.
     */
    distinct?: SettingScalarFieldEnum | SettingScalarFieldEnum[]
  }

  /**
   * Setting findMany
   */
  export type SettingFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Setting
     */
    select?: SettingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Setting
     */
    omit?: SettingOmit<ExtArgs> | null
    /**
     * Filter, which Settings to fetch.
     */
    where?: SettingWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Settings to fetch.
     */
    orderBy?: SettingOrderByWithRelationInput | SettingOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Settings.
     */
    cursor?: SettingWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Settings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Settings.
     */
    skip?: number
    distinct?: SettingScalarFieldEnum | SettingScalarFieldEnum[]
  }

  /**
   * Setting create
   */
  export type SettingCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Setting
     */
    select?: SettingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Setting
     */
    omit?: SettingOmit<ExtArgs> | null
    /**
     * The data needed to create a Setting.
     */
    data: XOR<SettingCreateInput, SettingUncheckedCreateInput>
  }

  /**
   * Setting createMany
   */
  export type SettingCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Settings.
     */
    data: SettingCreateManyInput | SettingCreateManyInput[]
  }

  /**
   * Setting createManyAndReturn
   */
  export type SettingCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Setting
     */
    select?: SettingSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Setting
     */
    omit?: SettingOmit<ExtArgs> | null
    /**
     * The data used to create many Settings.
     */
    data: SettingCreateManyInput | SettingCreateManyInput[]
  }

  /**
   * Setting update
   */
  export type SettingUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Setting
     */
    select?: SettingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Setting
     */
    omit?: SettingOmit<ExtArgs> | null
    /**
     * The data needed to update a Setting.
     */
    data: XOR<SettingUpdateInput, SettingUncheckedUpdateInput>
    /**
     * Choose, which Setting to update.
     */
    where: SettingWhereUniqueInput
  }

  /**
   * Setting updateMany
   */
  export type SettingUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Settings.
     */
    data: XOR<SettingUpdateManyMutationInput, SettingUncheckedUpdateManyInput>
    /**
     * Filter which Settings to update
     */
    where?: SettingWhereInput
    /**
     * Limit how many Settings to update.
     */
    limit?: number
  }

  /**
   * Setting updateManyAndReturn
   */
  export type SettingUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Setting
     */
    select?: SettingSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Setting
     */
    omit?: SettingOmit<ExtArgs> | null
    /**
     * The data used to update Settings.
     */
    data: XOR<SettingUpdateManyMutationInput, SettingUncheckedUpdateManyInput>
    /**
     * Filter which Settings to update
     */
    where?: SettingWhereInput
    /**
     * Limit how many Settings to update.
     */
    limit?: number
  }

  /**
   * Setting upsert
   */
  export type SettingUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Setting
     */
    select?: SettingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Setting
     */
    omit?: SettingOmit<ExtArgs> | null
    /**
     * The filter to search for the Setting to update in case it exists.
     */
    where: SettingWhereUniqueInput
    /**
     * In case the Setting found by the `where` argument doesn't exist, create a new Setting with this data.
     */
    create: XOR<SettingCreateInput, SettingUncheckedCreateInput>
    /**
     * In case the Setting was found with the provided `where` argument, update it with this data.
     */
    update: XOR<SettingUpdateInput, SettingUncheckedUpdateInput>
  }

  /**
   * Setting delete
   */
  export type SettingDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Setting
     */
    select?: SettingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Setting
     */
    omit?: SettingOmit<ExtArgs> | null
    /**
     * Filter which Setting to delete.
     */
    where: SettingWhereUniqueInput
  }

  /**
   * Setting deleteMany
   */
  export type SettingDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Settings to delete
     */
    where?: SettingWhereInput
    /**
     * Limit how many Settings to delete.
     */
    limit?: number
  }

  /**
   * Setting without action
   */
  export type SettingDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Setting
     */
    select?: SettingSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Setting
     */
    omit?: SettingOmit<ExtArgs> | null
  }


  /**
   * Model AnalyticsEvent
   */

  export type AggregateAnalyticsEvent = {
    _count: AnalyticsEventCountAggregateOutputType | null
    _avg: AnalyticsEventAvgAggregateOutputType | null
    _sum: AnalyticsEventSumAggregateOutputType | null
    _min: AnalyticsEventMinAggregateOutputType | null
    _max: AnalyticsEventMaxAggregateOutputType | null
  }

  export type AnalyticsEventAvgAggregateOutputType = {
    value: number | null
  }

  export type AnalyticsEventSumAggregateOutputType = {
    value: number | null
  }

  export type AnalyticsEventMinAggregateOutputType = {
    id: string | null
    eventType: string | null
    entityType: string | null
    entityId: string | null
    eventData: string | null
    value: number | null
    occurredAt: string | null
    createdAt: string | null
  }

  export type AnalyticsEventMaxAggregateOutputType = {
    id: string | null
    eventType: string | null
    entityType: string | null
    entityId: string | null
    eventData: string | null
    value: number | null
    occurredAt: string | null
    createdAt: string | null
  }

  export type AnalyticsEventCountAggregateOutputType = {
    id: number
    eventType: number
    entityType: number
    entityId: number
    eventData: number
    value: number
    occurredAt: number
    createdAt: number
    _all: number
  }


  export type AnalyticsEventAvgAggregateInputType = {
    value?: true
  }

  export type AnalyticsEventSumAggregateInputType = {
    value?: true
  }

  export type AnalyticsEventMinAggregateInputType = {
    id?: true
    eventType?: true
    entityType?: true
    entityId?: true
    eventData?: true
    value?: true
    occurredAt?: true
    createdAt?: true
  }

  export type AnalyticsEventMaxAggregateInputType = {
    id?: true
    eventType?: true
    entityType?: true
    entityId?: true
    eventData?: true
    value?: true
    occurredAt?: true
    createdAt?: true
  }

  export type AnalyticsEventCountAggregateInputType = {
    id?: true
    eventType?: true
    entityType?: true
    entityId?: true
    eventData?: true
    value?: true
    occurredAt?: true
    createdAt?: true
    _all?: true
  }

  export type AnalyticsEventAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which AnalyticsEvent to aggregate.
     */
    where?: AnalyticsEventWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AnalyticsEvents to fetch.
     */
    orderBy?: AnalyticsEventOrderByWithRelationInput | AnalyticsEventOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: AnalyticsEventWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AnalyticsEvents from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AnalyticsEvents.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned AnalyticsEvents
    **/
    _count?: true | AnalyticsEventCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: AnalyticsEventAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: AnalyticsEventSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: AnalyticsEventMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: AnalyticsEventMaxAggregateInputType
  }

  export type GetAnalyticsEventAggregateType<T extends AnalyticsEventAggregateArgs> = {
        [P in keyof T & keyof AggregateAnalyticsEvent]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateAnalyticsEvent[P]>
      : GetScalarType<T[P], AggregateAnalyticsEvent[P]>
  }




  export type AnalyticsEventGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: AnalyticsEventWhereInput
    orderBy?: AnalyticsEventOrderByWithAggregationInput | AnalyticsEventOrderByWithAggregationInput[]
    by: AnalyticsEventScalarFieldEnum[] | AnalyticsEventScalarFieldEnum
    having?: AnalyticsEventScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: AnalyticsEventCountAggregateInputType | true
    _avg?: AnalyticsEventAvgAggregateInputType
    _sum?: AnalyticsEventSumAggregateInputType
    _min?: AnalyticsEventMinAggregateInputType
    _max?: AnalyticsEventMaxAggregateInputType
  }

  export type AnalyticsEventGroupByOutputType = {
    id: string
    eventType: string
    entityType: string
    entityId: string
    eventData: string | null
    value: number | null
    occurredAt: string
    createdAt: string
    _count: AnalyticsEventCountAggregateOutputType | null
    _avg: AnalyticsEventAvgAggregateOutputType | null
    _sum: AnalyticsEventSumAggregateOutputType | null
    _min: AnalyticsEventMinAggregateOutputType | null
    _max: AnalyticsEventMaxAggregateOutputType | null
  }

  type GetAnalyticsEventGroupByPayload<T extends AnalyticsEventGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<AnalyticsEventGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof AnalyticsEventGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], AnalyticsEventGroupByOutputType[P]>
            : GetScalarType<T[P], AnalyticsEventGroupByOutputType[P]>
        }
      >
    >


  export type AnalyticsEventSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    eventType?: boolean
    entityType?: boolean
    entityId?: boolean
    eventData?: boolean
    value?: boolean
    occurredAt?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["analyticsEvent"]>

  export type AnalyticsEventSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    eventType?: boolean
    entityType?: boolean
    entityId?: boolean
    eventData?: boolean
    value?: boolean
    occurredAt?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["analyticsEvent"]>

  export type AnalyticsEventSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    eventType?: boolean
    entityType?: boolean
    entityId?: boolean
    eventData?: boolean
    value?: boolean
    occurredAt?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["analyticsEvent"]>

  export type AnalyticsEventSelectScalar = {
    id?: boolean
    eventType?: boolean
    entityType?: boolean
    entityId?: boolean
    eventData?: boolean
    value?: boolean
    occurredAt?: boolean
    createdAt?: boolean
  }

  export type AnalyticsEventOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "eventType" | "entityType" | "entityId" | "eventData" | "value" | "occurredAt" | "createdAt", ExtArgs["result"]["analyticsEvent"]>

  export type $AnalyticsEventPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "AnalyticsEvent"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: string
      eventType: string
      entityType: string
      entityId: string
      eventData: string | null
      value: number | null
      occurredAt: string
      createdAt: string
    }, ExtArgs["result"]["analyticsEvent"]>
    composites: {}
  }

  type AnalyticsEventGetPayload<S extends boolean | null | undefined | AnalyticsEventDefaultArgs> = $Result.GetResult<Prisma.$AnalyticsEventPayload, S>

  type AnalyticsEventCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<AnalyticsEventFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: AnalyticsEventCountAggregateInputType | true
    }

  export interface AnalyticsEventDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['AnalyticsEvent'], meta: { name: 'AnalyticsEvent' } }
    /**
     * Find zero or one AnalyticsEvent that matches the filter.
     * @param {AnalyticsEventFindUniqueArgs} args - Arguments to find a AnalyticsEvent
     * @example
     * // Get one AnalyticsEvent
     * const analyticsEvent = await prisma.analyticsEvent.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends AnalyticsEventFindUniqueArgs>(args: SelectSubset<T, AnalyticsEventFindUniqueArgs<ExtArgs>>): Prisma__AnalyticsEventClient<$Result.GetResult<Prisma.$AnalyticsEventPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one AnalyticsEvent that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {AnalyticsEventFindUniqueOrThrowArgs} args - Arguments to find a AnalyticsEvent
     * @example
     * // Get one AnalyticsEvent
     * const analyticsEvent = await prisma.analyticsEvent.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends AnalyticsEventFindUniqueOrThrowArgs>(args: SelectSubset<T, AnalyticsEventFindUniqueOrThrowArgs<ExtArgs>>): Prisma__AnalyticsEventClient<$Result.GetResult<Prisma.$AnalyticsEventPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first AnalyticsEvent that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AnalyticsEventFindFirstArgs} args - Arguments to find a AnalyticsEvent
     * @example
     * // Get one AnalyticsEvent
     * const analyticsEvent = await prisma.analyticsEvent.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends AnalyticsEventFindFirstArgs>(args?: SelectSubset<T, AnalyticsEventFindFirstArgs<ExtArgs>>): Prisma__AnalyticsEventClient<$Result.GetResult<Prisma.$AnalyticsEventPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first AnalyticsEvent that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AnalyticsEventFindFirstOrThrowArgs} args - Arguments to find a AnalyticsEvent
     * @example
     * // Get one AnalyticsEvent
     * const analyticsEvent = await prisma.analyticsEvent.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends AnalyticsEventFindFirstOrThrowArgs>(args?: SelectSubset<T, AnalyticsEventFindFirstOrThrowArgs<ExtArgs>>): Prisma__AnalyticsEventClient<$Result.GetResult<Prisma.$AnalyticsEventPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more AnalyticsEvents that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AnalyticsEventFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all AnalyticsEvents
     * const analyticsEvents = await prisma.analyticsEvent.findMany()
     * 
     * // Get first 10 AnalyticsEvents
     * const analyticsEvents = await prisma.analyticsEvent.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const analyticsEventWithIdOnly = await prisma.analyticsEvent.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends AnalyticsEventFindManyArgs>(args?: SelectSubset<T, AnalyticsEventFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AnalyticsEventPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a AnalyticsEvent.
     * @param {AnalyticsEventCreateArgs} args - Arguments to create a AnalyticsEvent.
     * @example
     * // Create one AnalyticsEvent
     * const AnalyticsEvent = await prisma.analyticsEvent.create({
     *   data: {
     *     // ... data to create a AnalyticsEvent
     *   }
     * })
     * 
     */
    create<T extends AnalyticsEventCreateArgs>(args: SelectSubset<T, AnalyticsEventCreateArgs<ExtArgs>>): Prisma__AnalyticsEventClient<$Result.GetResult<Prisma.$AnalyticsEventPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many AnalyticsEvents.
     * @param {AnalyticsEventCreateManyArgs} args - Arguments to create many AnalyticsEvents.
     * @example
     * // Create many AnalyticsEvents
     * const analyticsEvent = await prisma.analyticsEvent.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends AnalyticsEventCreateManyArgs>(args?: SelectSubset<T, AnalyticsEventCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many AnalyticsEvents and returns the data saved in the database.
     * @param {AnalyticsEventCreateManyAndReturnArgs} args - Arguments to create many AnalyticsEvents.
     * @example
     * // Create many AnalyticsEvents
     * const analyticsEvent = await prisma.analyticsEvent.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many AnalyticsEvents and only return the `id`
     * const analyticsEventWithIdOnly = await prisma.analyticsEvent.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends AnalyticsEventCreateManyAndReturnArgs>(args?: SelectSubset<T, AnalyticsEventCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AnalyticsEventPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a AnalyticsEvent.
     * @param {AnalyticsEventDeleteArgs} args - Arguments to delete one AnalyticsEvent.
     * @example
     * // Delete one AnalyticsEvent
     * const AnalyticsEvent = await prisma.analyticsEvent.delete({
     *   where: {
     *     // ... filter to delete one AnalyticsEvent
     *   }
     * })
     * 
     */
    delete<T extends AnalyticsEventDeleteArgs>(args: SelectSubset<T, AnalyticsEventDeleteArgs<ExtArgs>>): Prisma__AnalyticsEventClient<$Result.GetResult<Prisma.$AnalyticsEventPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one AnalyticsEvent.
     * @param {AnalyticsEventUpdateArgs} args - Arguments to update one AnalyticsEvent.
     * @example
     * // Update one AnalyticsEvent
     * const analyticsEvent = await prisma.analyticsEvent.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends AnalyticsEventUpdateArgs>(args: SelectSubset<T, AnalyticsEventUpdateArgs<ExtArgs>>): Prisma__AnalyticsEventClient<$Result.GetResult<Prisma.$AnalyticsEventPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more AnalyticsEvents.
     * @param {AnalyticsEventDeleteManyArgs} args - Arguments to filter AnalyticsEvents to delete.
     * @example
     * // Delete a few AnalyticsEvents
     * const { count } = await prisma.analyticsEvent.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends AnalyticsEventDeleteManyArgs>(args?: SelectSubset<T, AnalyticsEventDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more AnalyticsEvents.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AnalyticsEventUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many AnalyticsEvents
     * const analyticsEvent = await prisma.analyticsEvent.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends AnalyticsEventUpdateManyArgs>(args: SelectSubset<T, AnalyticsEventUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more AnalyticsEvents and returns the data updated in the database.
     * @param {AnalyticsEventUpdateManyAndReturnArgs} args - Arguments to update many AnalyticsEvents.
     * @example
     * // Update many AnalyticsEvents
     * const analyticsEvent = await prisma.analyticsEvent.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more AnalyticsEvents and only return the `id`
     * const analyticsEventWithIdOnly = await prisma.analyticsEvent.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends AnalyticsEventUpdateManyAndReturnArgs>(args: SelectSubset<T, AnalyticsEventUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AnalyticsEventPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one AnalyticsEvent.
     * @param {AnalyticsEventUpsertArgs} args - Arguments to update or create a AnalyticsEvent.
     * @example
     * // Update or create a AnalyticsEvent
     * const analyticsEvent = await prisma.analyticsEvent.upsert({
     *   create: {
     *     // ... data to create a AnalyticsEvent
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the AnalyticsEvent we want to update
     *   }
     * })
     */
    upsert<T extends AnalyticsEventUpsertArgs>(args: SelectSubset<T, AnalyticsEventUpsertArgs<ExtArgs>>): Prisma__AnalyticsEventClient<$Result.GetResult<Prisma.$AnalyticsEventPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of AnalyticsEvents.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AnalyticsEventCountArgs} args - Arguments to filter AnalyticsEvents to count.
     * @example
     * // Count the number of AnalyticsEvents
     * const count = await prisma.analyticsEvent.count({
     *   where: {
     *     // ... the filter for the AnalyticsEvents we want to count
     *   }
     * })
    **/
    count<T extends AnalyticsEventCountArgs>(
      args?: Subset<T, AnalyticsEventCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], AnalyticsEventCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a AnalyticsEvent.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AnalyticsEventAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends AnalyticsEventAggregateArgs>(args: Subset<T, AnalyticsEventAggregateArgs>): Prisma.PrismaPromise<GetAnalyticsEventAggregateType<T>>

    /**
     * Group by AnalyticsEvent.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AnalyticsEventGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends AnalyticsEventGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: AnalyticsEventGroupByArgs['orderBy'] }
        : { orderBy?: AnalyticsEventGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, AnalyticsEventGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetAnalyticsEventGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the AnalyticsEvent model
   */
  readonly fields: AnalyticsEventFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for AnalyticsEvent.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__AnalyticsEventClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the AnalyticsEvent model
   */
  interface AnalyticsEventFieldRefs {
    readonly id: FieldRef<"AnalyticsEvent", 'String'>
    readonly eventType: FieldRef<"AnalyticsEvent", 'String'>
    readonly entityType: FieldRef<"AnalyticsEvent", 'String'>
    readonly entityId: FieldRef<"AnalyticsEvent", 'String'>
    readonly eventData: FieldRef<"AnalyticsEvent", 'String'>
    readonly value: FieldRef<"AnalyticsEvent", 'Float'>
    readonly occurredAt: FieldRef<"AnalyticsEvent", 'String'>
    readonly createdAt: FieldRef<"AnalyticsEvent", 'String'>
  }
    

  // Custom InputTypes
  /**
   * AnalyticsEvent findUnique
   */
  export type AnalyticsEventFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AnalyticsEvent
     */
    select?: AnalyticsEventSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AnalyticsEvent
     */
    omit?: AnalyticsEventOmit<ExtArgs> | null
    /**
     * Filter, which AnalyticsEvent to fetch.
     */
    where: AnalyticsEventWhereUniqueInput
  }

  /**
   * AnalyticsEvent findUniqueOrThrow
   */
  export type AnalyticsEventFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AnalyticsEvent
     */
    select?: AnalyticsEventSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AnalyticsEvent
     */
    omit?: AnalyticsEventOmit<ExtArgs> | null
    /**
     * Filter, which AnalyticsEvent to fetch.
     */
    where: AnalyticsEventWhereUniqueInput
  }

  /**
   * AnalyticsEvent findFirst
   */
  export type AnalyticsEventFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AnalyticsEvent
     */
    select?: AnalyticsEventSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AnalyticsEvent
     */
    omit?: AnalyticsEventOmit<ExtArgs> | null
    /**
     * Filter, which AnalyticsEvent to fetch.
     */
    where?: AnalyticsEventWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AnalyticsEvents to fetch.
     */
    orderBy?: AnalyticsEventOrderByWithRelationInput | AnalyticsEventOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for AnalyticsEvents.
     */
    cursor?: AnalyticsEventWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AnalyticsEvents from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AnalyticsEvents.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of AnalyticsEvents.
     */
    distinct?: AnalyticsEventScalarFieldEnum | AnalyticsEventScalarFieldEnum[]
  }

  /**
   * AnalyticsEvent findFirstOrThrow
   */
  export type AnalyticsEventFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AnalyticsEvent
     */
    select?: AnalyticsEventSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AnalyticsEvent
     */
    omit?: AnalyticsEventOmit<ExtArgs> | null
    /**
     * Filter, which AnalyticsEvent to fetch.
     */
    where?: AnalyticsEventWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AnalyticsEvents to fetch.
     */
    orderBy?: AnalyticsEventOrderByWithRelationInput | AnalyticsEventOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for AnalyticsEvents.
     */
    cursor?: AnalyticsEventWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AnalyticsEvents from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AnalyticsEvents.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of AnalyticsEvents.
     */
    distinct?: AnalyticsEventScalarFieldEnum | AnalyticsEventScalarFieldEnum[]
  }

  /**
   * AnalyticsEvent findMany
   */
  export type AnalyticsEventFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AnalyticsEvent
     */
    select?: AnalyticsEventSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AnalyticsEvent
     */
    omit?: AnalyticsEventOmit<ExtArgs> | null
    /**
     * Filter, which AnalyticsEvents to fetch.
     */
    where?: AnalyticsEventWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AnalyticsEvents to fetch.
     */
    orderBy?: AnalyticsEventOrderByWithRelationInput | AnalyticsEventOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing AnalyticsEvents.
     */
    cursor?: AnalyticsEventWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AnalyticsEvents from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AnalyticsEvents.
     */
    skip?: number
    distinct?: AnalyticsEventScalarFieldEnum | AnalyticsEventScalarFieldEnum[]
  }

  /**
   * AnalyticsEvent create
   */
  export type AnalyticsEventCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AnalyticsEvent
     */
    select?: AnalyticsEventSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AnalyticsEvent
     */
    omit?: AnalyticsEventOmit<ExtArgs> | null
    /**
     * The data needed to create a AnalyticsEvent.
     */
    data: XOR<AnalyticsEventCreateInput, AnalyticsEventUncheckedCreateInput>
  }

  /**
   * AnalyticsEvent createMany
   */
  export type AnalyticsEventCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many AnalyticsEvents.
     */
    data: AnalyticsEventCreateManyInput | AnalyticsEventCreateManyInput[]
  }

  /**
   * AnalyticsEvent createManyAndReturn
   */
  export type AnalyticsEventCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AnalyticsEvent
     */
    select?: AnalyticsEventSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the AnalyticsEvent
     */
    omit?: AnalyticsEventOmit<ExtArgs> | null
    /**
     * The data used to create many AnalyticsEvents.
     */
    data: AnalyticsEventCreateManyInput | AnalyticsEventCreateManyInput[]
  }

  /**
   * AnalyticsEvent update
   */
  export type AnalyticsEventUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AnalyticsEvent
     */
    select?: AnalyticsEventSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AnalyticsEvent
     */
    omit?: AnalyticsEventOmit<ExtArgs> | null
    /**
     * The data needed to update a AnalyticsEvent.
     */
    data: XOR<AnalyticsEventUpdateInput, AnalyticsEventUncheckedUpdateInput>
    /**
     * Choose, which AnalyticsEvent to update.
     */
    where: AnalyticsEventWhereUniqueInput
  }

  /**
   * AnalyticsEvent updateMany
   */
  export type AnalyticsEventUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update AnalyticsEvents.
     */
    data: XOR<AnalyticsEventUpdateManyMutationInput, AnalyticsEventUncheckedUpdateManyInput>
    /**
     * Filter which AnalyticsEvents to update
     */
    where?: AnalyticsEventWhereInput
    /**
     * Limit how many AnalyticsEvents to update.
     */
    limit?: number
  }

  /**
   * AnalyticsEvent updateManyAndReturn
   */
  export type AnalyticsEventUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AnalyticsEvent
     */
    select?: AnalyticsEventSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the AnalyticsEvent
     */
    omit?: AnalyticsEventOmit<ExtArgs> | null
    /**
     * The data used to update AnalyticsEvents.
     */
    data: XOR<AnalyticsEventUpdateManyMutationInput, AnalyticsEventUncheckedUpdateManyInput>
    /**
     * Filter which AnalyticsEvents to update
     */
    where?: AnalyticsEventWhereInput
    /**
     * Limit how many AnalyticsEvents to update.
     */
    limit?: number
  }

  /**
   * AnalyticsEvent upsert
   */
  export type AnalyticsEventUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AnalyticsEvent
     */
    select?: AnalyticsEventSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AnalyticsEvent
     */
    omit?: AnalyticsEventOmit<ExtArgs> | null
    /**
     * The filter to search for the AnalyticsEvent to update in case it exists.
     */
    where: AnalyticsEventWhereUniqueInput
    /**
     * In case the AnalyticsEvent found by the `where` argument doesn't exist, create a new AnalyticsEvent with this data.
     */
    create: XOR<AnalyticsEventCreateInput, AnalyticsEventUncheckedCreateInput>
    /**
     * In case the AnalyticsEvent was found with the provided `where` argument, update it with this data.
     */
    update: XOR<AnalyticsEventUpdateInput, AnalyticsEventUncheckedUpdateInput>
  }

  /**
   * AnalyticsEvent delete
   */
  export type AnalyticsEventDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AnalyticsEvent
     */
    select?: AnalyticsEventSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AnalyticsEvent
     */
    omit?: AnalyticsEventOmit<ExtArgs> | null
    /**
     * Filter which AnalyticsEvent to delete.
     */
    where: AnalyticsEventWhereUniqueInput
  }

  /**
   * AnalyticsEvent deleteMany
   */
  export type AnalyticsEventDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which AnalyticsEvents to delete
     */
    where?: AnalyticsEventWhereInput
    /**
     * Limit how many AnalyticsEvents to delete.
     */
    limit?: number
  }

  /**
   * AnalyticsEvent without action
   */
  export type AnalyticsEventDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AnalyticsEvent
     */
    select?: AnalyticsEventSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AnalyticsEvent
     */
    omit?: AnalyticsEventOmit<ExtArgs> | null
  }


  /**
   * Enums
   */

  export const TransactionIsolationLevel: {
    Serializable: 'Serializable'
  };

  export type TransactionIsolationLevel = (typeof TransactionIsolationLevel)[keyof typeof TransactionIsolationLevel]


  export const TranscriptScalarFieldEnum: {
    id: 'id',
    title: 'title',
    rawContent: 'rawContent',
    cleanedContent: 'cleanedContent',
    status: 'status',
    sourceType: 'sourceType',
    sourceUrl: 'sourceUrl',
    fileName: 'fileName',
    duration: 'duration',
    wordCount: 'wordCount',
    filePath: 'filePath',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type TranscriptScalarFieldEnum = (typeof TranscriptScalarFieldEnum)[keyof typeof TranscriptScalarFieldEnum]


  export const InsightScalarFieldEnum: {
    id: 'id',
    cleanedTranscriptId: 'cleanedTranscriptId',
    title: 'title',
    summary: 'summary',
    verbatimQuote: 'verbatimQuote',
    category: 'category',
    postType: 'postType',
    urgencyScore: 'urgencyScore',
    relatabilityScore: 'relatabilityScore',
    specificityScore: 'specificityScore',
    authorityScore: 'authorityScore',
    totalScore: 'totalScore',
    status: 'status',
    processingDurationMs: 'processingDurationMs',
    estimatedTokens: 'estimatedTokens',
    estimatedCost: 'estimatedCost',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type InsightScalarFieldEnum = (typeof InsightScalarFieldEnum)[keyof typeof InsightScalarFieldEnum]


  export const PostScalarFieldEnum: {
    id: 'id',
    insightId: 'insightId',
    title: 'title',
    platform: 'platform',
    content: 'content',
    status: 'status',
    characterCount: 'characterCount',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type PostScalarFieldEnum = (typeof PostScalarFieldEnum)[keyof typeof PostScalarFieldEnum]


  export const ScheduledPostScalarFieldEnum: {
    id: 'id',
    postId: 'postId',
    platform: 'platform',
    content: 'content',
    scheduledTime: 'scheduledTime',
    status: 'status',
    retryCount: 'retryCount',
    lastAttempt: 'lastAttempt',
    errorMessage: 'errorMessage',
    externalPostId: 'externalPostId',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type ScheduledPostScalarFieldEnum = (typeof ScheduledPostScalarFieldEnum)[keyof typeof ScheduledPostScalarFieldEnum]


  export const ProcessingJobScalarFieldEnum: {
    id: 'id',
    jobType: 'jobType',
    sourceId: 'sourceId',
    status: 'status',
    progress: 'progress',
    resultCount: 'resultCount',
    errorMessage: 'errorMessage',
    startedAt: 'startedAt',
    completedAt: 'completedAt',
    durationMs: 'durationMs',
    estimatedTokens: 'estimatedTokens',
    estimatedCost: 'estimatedCost',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type ProcessingJobScalarFieldEnum = (typeof ProcessingJobScalarFieldEnum)[keyof typeof ProcessingJobScalarFieldEnum]


  export const SettingScalarFieldEnum: {
    key: 'key',
    value: 'value',
    category: 'category',
    description: 'description',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type SettingScalarFieldEnum = (typeof SettingScalarFieldEnum)[keyof typeof SettingScalarFieldEnum]


  export const AnalyticsEventScalarFieldEnum: {
    id: 'id',
    eventType: 'eventType',
    entityType: 'entityType',
    entityId: 'entityId',
    eventData: 'eventData',
    value: 'value',
    occurredAt: 'occurredAt',
    createdAt: 'createdAt'
  };

  export type AnalyticsEventScalarFieldEnum = (typeof AnalyticsEventScalarFieldEnum)[keyof typeof AnalyticsEventScalarFieldEnum]


  export const SortOrder: {
    asc: 'asc',
    desc: 'desc'
  };

  export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder]


  export const NullsOrder: {
    first: 'first',
    last: 'last'
  };

  export type NullsOrder = (typeof NullsOrder)[keyof typeof NullsOrder]


  /**
   * Field references
   */


  /**
   * Reference to a field of type 'String'
   */
  export type StringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String'>
    


  /**
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>
    


  /**
   * Reference to a field of type 'Float'
   */
  export type FloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float'>
    


  /**
   * Reference to a field of type 'DateTime'
   */
  export type DateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime'>
    
  /**
   * Deep Input Types
   */


  export type TranscriptWhereInput = {
    AND?: TranscriptWhereInput | TranscriptWhereInput[]
    OR?: TranscriptWhereInput[]
    NOT?: TranscriptWhereInput | TranscriptWhereInput[]
    id?: StringFilter<"Transcript"> | string
    title?: StringFilter<"Transcript"> | string
    rawContent?: StringFilter<"Transcript"> | string
    cleanedContent?: StringNullableFilter<"Transcript"> | string | null
    status?: StringFilter<"Transcript"> | string
    sourceType?: StringNullableFilter<"Transcript"> | string | null
    sourceUrl?: StringNullableFilter<"Transcript"> | string | null
    fileName?: StringNullableFilter<"Transcript"> | string | null
    duration?: IntNullableFilter<"Transcript"> | number | null
    wordCount?: IntFilter<"Transcript"> | number
    filePath?: StringNullableFilter<"Transcript"> | string | null
    createdAt?: StringFilter<"Transcript"> | string
    updatedAt?: StringFilter<"Transcript"> | string
    insights?: InsightListRelationFilter
  }

  export type TranscriptOrderByWithRelationInput = {
    id?: SortOrder
    title?: SortOrder
    rawContent?: SortOrder
    cleanedContent?: SortOrderInput | SortOrder
    status?: SortOrder
    sourceType?: SortOrderInput | SortOrder
    sourceUrl?: SortOrderInput | SortOrder
    fileName?: SortOrderInput | SortOrder
    duration?: SortOrderInput | SortOrder
    wordCount?: SortOrder
    filePath?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    insights?: InsightOrderByRelationAggregateInput
  }

  export type TranscriptWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: TranscriptWhereInput | TranscriptWhereInput[]
    OR?: TranscriptWhereInput[]
    NOT?: TranscriptWhereInput | TranscriptWhereInput[]
    title?: StringFilter<"Transcript"> | string
    rawContent?: StringFilter<"Transcript"> | string
    cleanedContent?: StringNullableFilter<"Transcript"> | string | null
    status?: StringFilter<"Transcript"> | string
    sourceType?: StringNullableFilter<"Transcript"> | string | null
    sourceUrl?: StringNullableFilter<"Transcript"> | string | null
    fileName?: StringNullableFilter<"Transcript"> | string | null
    duration?: IntNullableFilter<"Transcript"> | number | null
    wordCount?: IntFilter<"Transcript"> | number
    filePath?: StringNullableFilter<"Transcript"> | string | null
    createdAt?: StringFilter<"Transcript"> | string
    updatedAt?: StringFilter<"Transcript"> | string
    insights?: InsightListRelationFilter
  }, "id">

  export type TranscriptOrderByWithAggregationInput = {
    id?: SortOrder
    title?: SortOrder
    rawContent?: SortOrder
    cleanedContent?: SortOrderInput | SortOrder
    status?: SortOrder
    sourceType?: SortOrderInput | SortOrder
    sourceUrl?: SortOrderInput | SortOrder
    fileName?: SortOrderInput | SortOrder
    duration?: SortOrderInput | SortOrder
    wordCount?: SortOrder
    filePath?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: TranscriptCountOrderByAggregateInput
    _avg?: TranscriptAvgOrderByAggregateInput
    _max?: TranscriptMaxOrderByAggregateInput
    _min?: TranscriptMinOrderByAggregateInput
    _sum?: TranscriptSumOrderByAggregateInput
  }

  export type TranscriptScalarWhereWithAggregatesInput = {
    AND?: TranscriptScalarWhereWithAggregatesInput | TranscriptScalarWhereWithAggregatesInput[]
    OR?: TranscriptScalarWhereWithAggregatesInput[]
    NOT?: TranscriptScalarWhereWithAggregatesInput | TranscriptScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Transcript"> | string
    title?: StringWithAggregatesFilter<"Transcript"> | string
    rawContent?: StringWithAggregatesFilter<"Transcript"> | string
    cleanedContent?: StringNullableWithAggregatesFilter<"Transcript"> | string | null
    status?: StringWithAggregatesFilter<"Transcript"> | string
    sourceType?: StringNullableWithAggregatesFilter<"Transcript"> | string | null
    sourceUrl?: StringNullableWithAggregatesFilter<"Transcript"> | string | null
    fileName?: StringNullableWithAggregatesFilter<"Transcript"> | string | null
    duration?: IntNullableWithAggregatesFilter<"Transcript"> | number | null
    wordCount?: IntWithAggregatesFilter<"Transcript"> | number
    filePath?: StringNullableWithAggregatesFilter<"Transcript"> | string | null
    createdAt?: StringWithAggregatesFilter<"Transcript"> | string
    updatedAt?: StringWithAggregatesFilter<"Transcript"> | string
  }

  export type InsightWhereInput = {
    AND?: InsightWhereInput | InsightWhereInput[]
    OR?: InsightWhereInput[]
    NOT?: InsightWhereInput | InsightWhereInput[]
    id?: StringFilter<"Insight"> | string
    cleanedTranscriptId?: StringFilter<"Insight"> | string
    title?: StringFilter<"Insight"> | string
    summary?: StringFilter<"Insight"> | string
    verbatimQuote?: StringFilter<"Insight"> | string
    category?: StringFilter<"Insight"> | string
    postType?: StringFilter<"Insight"> | string
    urgencyScore?: IntFilter<"Insight"> | number
    relatabilityScore?: IntFilter<"Insight"> | number
    specificityScore?: IntFilter<"Insight"> | number
    authorityScore?: IntFilter<"Insight"> | number
    totalScore?: IntFilter<"Insight"> | number
    status?: StringFilter<"Insight"> | string
    processingDurationMs?: IntNullableFilter<"Insight"> | number | null
    estimatedTokens?: IntNullableFilter<"Insight"> | number | null
    estimatedCost?: FloatNullableFilter<"Insight"> | number | null
    createdAt?: DateTimeFilter<"Insight"> | Date | string
    updatedAt?: DateTimeFilter<"Insight"> | Date | string
    transcript?: XOR<TranscriptScalarRelationFilter, TranscriptWhereInput>
    posts?: PostListRelationFilter
  }

  export type InsightOrderByWithRelationInput = {
    id?: SortOrder
    cleanedTranscriptId?: SortOrder
    title?: SortOrder
    summary?: SortOrder
    verbatimQuote?: SortOrder
    category?: SortOrder
    postType?: SortOrder
    urgencyScore?: SortOrder
    relatabilityScore?: SortOrder
    specificityScore?: SortOrder
    authorityScore?: SortOrder
    totalScore?: SortOrder
    status?: SortOrder
    processingDurationMs?: SortOrderInput | SortOrder
    estimatedTokens?: SortOrderInput | SortOrder
    estimatedCost?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    transcript?: TranscriptOrderByWithRelationInput
    posts?: PostOrderByRelationAggregateInput
  }

  export type InsightWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: InsightWhereInput | InsightWhereInput[]
    OR?: InsightWhereInput[]
    NOT?: InsightWhereInput | InsightWhereInput[]
    cleanedTranscriptId?: StringFilter<"Insight"> | string
    title?: StringFilter<"Insight"> | string
    summary?: StringFilter<"Insight"> | string
    verbatimQuote?: StringFilter<"Insight"> | string
    category?: StringFilter<"Insight"> | string
    postType?: StringFilter<"Insight"> | string
    urgencyScore?: IntFilter<"Insight"> | number
    relatabilityScore?: IntFilter<"Insight"> | number
    specificityScore?: IntFilter<"Insight"> | number
    authorityScore?: IntFilter<"Insight"> | number
    totalScore?: IntFilter<"Insight"> | number
    status?: StringFilter<"Insight"> | string
    processingDurationMs?: IntNullableFilter<"Insight"> | number | null
    estimatedTokens?: IntNullableFilter<"Insight"> | number | null
    estimatedCost?: FloatNullableFilter<"Insight"> | number | null
    createdAt?: DateTimeFilter<"Insight"> | Date | string
    updatedAt?: DateTimeFilter<"Insight"> | Date | string
    transcript?: XOR<TranscriptScalarRelationFilter, TranscriptWhereInput>
    posts?: PostListRelationFilter
  }, "id">

  export type InsightOrderByWithAggregationInput = {
    id?: SortOrder
    cleanedTranscriptId?: SortOrder
    title?: SortOrder
    summary?: SortOrder
    verbatimQuote?: SortOrder
    category?: SortOrder
    postType?: SortOrder
    urgencyScore?: SortOrder
    relatabilityScore?: SortOrder
    specificityScore?: SortOrder
    authorityScore?: SortOrder
    totalScore?: SortOrder
    status?: SortOrder
    processingDurationMs?: SortOrderInput | SortOrder
    estimatedTokens?: SortOrderInput | SortOrder
    estimatedCost?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: InsightCountOrderByAggregateInput
    _avg?: InsightAvgOrderByAggregateInput
    _max?: InsightMaxOrderByAggregateInput
    _min?: InsightMinOrderByAggregateInput
    _sum?: InsightSumOrderByAggregateInput
  }

  export type InsightScalarWhereWithAggregatesInput = {
    AND?: InsightScalarWhereWithAggregatesInput | InsightScalarWhereWithAggregatesInput[]
    OR?: InsightScalarWhereWithAggregatesInput[]
    NOT?: InsightScalarWhereWithAggregatesInput | InsightScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Insight"> | string
    cleanedTranscriptId?: StringWithAggregatesFilter<"Insight"> | string
    title?: StringWithAggregatesFilter<"Insight"> | string
    summary?: StringWithAggregatesFilter<"Insight"> | string
    verbatimQuote?: StringWithAggregatesFilter<"Insight"> | string
    category?: StringWithAggregatesFilter<"Insight"> | string
    postType?: StringWithAggregatesFilter<"Insight"> | string
    urgencyScore?: IntWithAggregatesFilter<"Insight"> | number
    relatabilityScore?: IntWithAggregatesFilter<"Insight"> | number
    specificityScore?: IntWithAggregatesFilter<"Insight"> | number
    authorityScore?: IntWithAggregatesFilter<"Insight"> | number
    totalScore?: IntWithAggregatesFilter<"Insight"> | number
    status?: StringWithAggregatesFilter<"Insight"> | string
    processingDurationMs?: IntNullableWithAggregatesFilter<"Insight"> | number | null
    estimatedTokens?: IntNullableWithAggregatesFilter<"Insight"> | number | null
    estimatedCost?: FloatNullableWithAggregatesFilter<"Insight"> | number | null
    createdAt?: DateTimeWithAggregatesFilter<"Insight"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Insight"> | Date | string
  }

  export type PostWhereInput = {
    AND?: PostWhereInput | PostWhereInput[]
    OR?: PostWhereInput[]
    NOT?: PostWhereInput | PostWhereInput[]
    id?: StringFilter<"Post"> | string
    insightId?: StringFilter<"Post"> | string
    title?: StringFilter<"Post"> | string
    platform?: StringFilter<"Post"> | string
    content?: StringFilter<"Post"> | string
    status?: StringFilter<"Post"> | string
    characterCount?: IntNullableFilter<"Post"> | number | null
    createdAt?: StringFilter<"Post"> | string
    updatedAt?: StringFilter<"Post"> | string
    insight?: XOR<InsightScalarRelationFilter, InsightWhereInput>
    scheduledPosts?: ScheduledPostListRelationFilter
  }

  export type PostOrderByWithRelationInput = {
    id?: SortOrder
    insightId?: SortOrder
    title?: SortOrder
    platform?: SortOrder
    content?: SortOrder
    status?: SortOrder
    characterCount?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    insight?: InsightOrderByWithRelationInput
    scheduledPosts?: ScheduledPostOrderByRelationAggregateInput
  }

  export type PostWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: PostWhereInput | PostWhereInput[]
    OR?: PostWhereInput[]
    NOT?: PostWhereInput | PostWhereInput[]
    insightId?: StringFilter<"Post"> | string
    title?: StringFilter<"Post"> | string
    platform?: StringFilter<"Post"> | string
    content?: StringFilter<"Post"> | string
    status?: StringFilter<"Post"> | string
    characterCount?: IntNullableFilter<"Post"> | number | null
    createdAt?: StringFilter<"Post"> | string
    updatedAt?: StringFilter<"Post"> | string
    insight?: XOR<InsightScalarRelationFilter, InsightWhereInput>
    scheduledPosts?: ScheduledPostListRelationFilter
  }, "id">

  export type PostOrderByWithAggregationInput = {
    id?: SortOrder
    insightId?: SortOrder
    title?: SortOrder
    platform?: SortOrder
    content?: SortOrder
    status?: SortOrder
    characterCount?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: PostCountOrderByAggregateInput
    _avg?: PostAvgOrderByAggregateInput
    _max?: PostMaxOrderByAggregateInput
    _min?: PostMinOrderByAggregateInput
    _sum?: PostSumOrderByAggregateInput
  }

  export type PostScalarWhereWithAggregatesInput = {
    AND?: PostScalarWhereWithAggregatesInput | PostScalarWhereWithAggregatesInput[]
    OR?: PostScalarWhereWithAggregatesInput[]
    NOT?: PostScalarWhereWithAggregatesInput | PostScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Post"> | string
    insightId?: StringWithAggregatesFilter<"Post"> | string
    title?: StringWithAggregatesFilter<"Post"> | string
    platform?: StringWithAggregatesFilter<"Post"> | string
    content?: StringWithAggregatesFilter<"Post"> | string
    status?: StringWithAggregatesFilter<"Post"> | string
    characterCount?: IntNullableWithAggregatesFilter<"Post"> | number | null
    createdAt?: StringWithAggregatesFilter<"Post"> | string
    updatedAt?: StringWithAggregatesFilter<"Post"> | string
  }

  export type ScheduledPostWhereInput = {
    AND?: ScheduledPostWhereInput | ScheduledPostWhereInput[]
    OR?: ScheduledPostWhereInput[]
    NOT?: ScheduledPostWhereInput | ScheduledPostWhereInput[]
    id?: StringFilter<"ScheduledPost"> | string
    postId?: StringFilter<"ScheduledPost"> | string
    platform?: StringFilter<"ScheduledPost"> | string
    content?: StringFilter<"ScheduledPost"> | string
    scheduledTime?: StringFilter<"ScheduledPost"> | string
    status?: StringFilter<"ScheduledPost"> | string
    retryCount?: IntFilter<"ScheduledPost"> | number
    lastAttempt?: StringNullableFilter<"ScheduledPost"> | string | null
    errorMessage?: StringNullableFilter<"ScheduledPost"> | string | null
    externalPostId?: StringNullableFilter<"ScheduledPost"> | string | null
    createdAt?: DateTimeFilter<"ScheduledPost"> | Date | string
    updatedAt?: DateTimeFilter<"ScheduledPost"> | Date | string
    post?: XOR<PostScalarRelationFilter, PostWhereInput>
  }

  export type ScheduledPostOrderByWithRelationInput = {
    id?: SortOrder
    postId?: SortOrder
    platform?: SortOrder
    content?: SortOrder
    scheduledTime?: SortOrder
    status?: SortOrder
    retryCount?: SortOrder
    lastAttempt?: SortOrderInput | SortOrder
    errorMessage?: SortOrderInput | SortOrder
    externalPostId?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    post?: PostOrderByWithRelationInput
  }

  export type ScheduledPostWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: ScheduledPostWhereInput | ScheduledPostWhereInput[]
    OR?: ScheduledPostWhereInput[]
    NOT?: ScheduledPostWhereInput | ScheduledPostWhereInput[]
    postId?: StringFilter<"ScheduledPost"> | string
    platform?: StringFilter<"ScheduledPost"> | string
    content?: StringFilter<"ScheduledPost"> | string
    scheduledTime?: StringFilter<"ScheduledPost"> | string
    status?: StringFilter<"ScheduledPost"> | string
    retryCount?: IntFilter<"ScheduledPost"> | number
    lastAttempt?: StringNullableFilter<"ScheduledPost"> | string | null
    errorMessage?: StringNullableFilter<"ScheduledPost"> | string | null
    externalPostId?: StringNullableFilter<"ScheduledPost"> | string | null
    createdAt?: DateTimeFilter<"ScheduledPost"> | Date | string
    updatedAt?: DateTimeFilter<"ScheduledPost"> | Date | string
    post?: XOR<PostScalarRelationFilter, PostWhereInput>
  }, "id">

  export type ScheduledPostOrderByWithAggregationInput = {
    id?: SortOrder
    postId?: SortOrder
    platform?: SortOrder
    content?: SortOrder
    scheduledTime?: SortOrder
    status?: SortOrder
    retryCount?: SortOrder
    lastAttempt?: SortOrderInput | SortOrder
    errorMessage?: SortOrderInput | SortOrder
    externalPostId?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: ScheduledPostCountOrderByAggregateInput
    _avg?: ScheduledPostAvgOrderByAggregateInput
    _max?: ScheduledPostMaxOrderByAggregateInput
    _min?: ScheduledPostMinOrderByAggregateInput
    _sum?: ScheduledPostSumOrderByAggregateInput
  }

  export type ScheduledPostScalarWhereWithAggregatesInput = {
    AND?: ScheduledPostScalarWhereWithAggregatesInput | ScheduledPostScalarWhereWithAggregatesInput[]
    OR?: ScheduledPostScalarWhereWithAggregatesInput[]
    NOT?: ScheduledPostScalarWhereWithAggregatesInput | ScheduledPostScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"ScheduledPost"> | string
    postId?: StringWithAggregatesFilter<"ScheduledPost"> | string
    platform?: StringWithAggregatesFilter<"ScheduledPost"> | string
    content?: StringWithAggregatesFilter<"ScheduledPost"> | string
    scheduledTime?: StringWithAggregatesFilter<"ScheduledPost"> | string
    status?: StringWithAggregatesFilter<"ScheduledPost"> | string
    retryCount?: IntWithAggregatesFilter<"ScheduledPost"> | number
    lastAttempt?: StringNullableWithAggregatesFilter<"ScheduledPost"> | string | null
    errorMessage?: StringNullableWithAggregatesFilter<"ScheduledPost"> | string | null
    externalPostId?: StringNullableWithAggregatesFilter<"ScheduledPost"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"ScheduledPost"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"ScheduledPost"> | Date | string
  }

  export type ProcessingJobWhereInput = {
    AND?: ProcessingJobWhereInput | ProcessingJobWhereInput[]
    OR?: ProcessingJobWhereInput[]
    NOT?: ProcessingJobWhereInput | ProcessingJobWhereInput[]
    id?: StringFilter<"ProcessingJob"> | string
    jobType?: StringFilter<"ProcessingJob"> | string
    sourceId?: StringFilter<"ProcessingJob"> | string
    status?: StringFilter<"ProcessingJob"> | string
    progress?: IntFilter<"ProcessingJob"> | number
    resultCount?: IntFilter<"ProcessingJob"> | number
    errorMessage?: StringNullableFilter<"ProcessingJob"> | string | null
    startedAt?: StringNullableFilter<"ProcessingJob"> | string | null
    completedAt?: StringNullableFilter<"ProcessingJob"> | string | null
    durationMs?: IntNullableFilter<"ProcessingJob"> | number | null
    estimatedTokens?: IntNullableFilter<"ProcessingJob"> | number | null
    estimatedCost?: FloatNullableFilter<"ProcessingJob"> | number | null
    createdAt?: DateTimeFilter<"ProcessingJob"> | Date | string
    updatedAt?: DateTimeFilter<"ProcessingJob"> | Date | string
  }

  export type ProcessingJobOrderByWithRelationInput = {
    id?: SortOrder
    jobType?: SortOrder
    sourceId?: SortOrder
    status?: SortOrder
    progress?: SortOrder
    resultCount?: SortOrder
    errorMessage?: SortOrderInput | SortOrder
    startedAt?: SortOrderInput | SortOrder
    completedAt?: SortOrderInput | SortOrder
    durationMs?: SortOrderInput | SortOrder
    estimatedTokens?: SortOrderInput | SortOrder
    estimatedCost?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type ProcessingJobWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: ProcessingJobWhereInput | ProcessingJobWhereInput[]
    OR?: ProcessingJobWhereInput[]
    NOT?: ProcessingJobWhereInput | ProcessingJobWhereInput[]
    jobType?: StringFilter<"ProcessingJob"> | string
    sourceId?: StringFilter<"ProcessingJob"> | string
    status?: StringFilter<"ProcessingJob"> | string
    progress?: IntFilter<"ProcessingJob"> | number
    resultCount?: IntFilter<"ProcessingJob"> | number
    errorMessage?: StringNullableFilter<"ProcessingJob"> | string | null
    startedAt?: StringNullableFilter<"ProcessingJob"> | string | null
    completedAt?: StringNullableFilter<"ProcessingJob"> | string | null
    durationMs?: IntNullableFilter<"ProcessingJob"> | number | null
    estimatedTokens?: IntNullableFilter<"ProcessingJob"> | number | null
    estimatedCost?: FloatNullableFilter<"ProcessingJob"> | number | null
    createdAt?: DateTimeFilter<"ProcessingJob"> | Date | string
    updatedAt?: DateTimeFilter<"ProcessingJob"> | Date | string
  }, "id">

  export type ProcessingJobOrderByWithAggregationInput = {
    id?: SortOrder
    jobType?: SortOrder
    sourceId?: SortOrder
    status?: SortOrder
    progress?: SortOrder
    resultCount?: SortOrder
    errorMessage?: SortOrderInput | SortOrder
    startedAt?: SortOrderInput | SortOrder
    completedAt?: SortOrderInput | SortOrder
    durationMs?: SortOrderInput | SortOrder
    estimatedTokens?: SortOrderInput | SortOrder
    estimatedCost?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: ProcessingJobCountOrderByAggregateInput
    _avg?: ProcessingJobAvgOrderByAggregateInput
    _max?: ProcessingJobMaxOrderByAggregateInput
    _min?: ProcessingJobMinOrderByAggregateInput
    _sum?: ProcessingJobSumOrderByAggregateInput
  }

  export type ProcessingJobScalarWhereWithAggregatesInput = {
    AND?: ProcessingJobScalarWhereWithAggregatesInput | ProcessingJobScalarWhereWithAggregatesInput[]
    OR?: ProcessingJobScalarWhereWithAggregatesInput[]
    NOT?: ProcessingJobScalarWhereWithAggregatesInput | ProcessingJobScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"ProcessingJob"> | string
    jobType?: StringWithAggregatesFilter<"ProcessingJob"> | string
    sourceId?: StringWithAggregatesFilter<"ProcessingJob"> | string
    status?: StringWithAggregatesFilter<"ProcessingJob"> | string
    progress?: IntWithAggregatesFilter<"ProcessingJob"> | number
    resultCount?: IntWithAggregatesFilter<"ProcessingJob"> | number
    errorMessage?: StringNullableWithAggregatesFilter<"ProcessingJob"> | string | null
    startedAt?: StringNullableWithAggregatesFilter<"ProcessingJob"> | string | null
    completedAt?: StringNullableWithAggregatesFilter<"ProcessingJob"> | string | null
    durationMs?: IntNullableWithAggregatesFilter<"ProcessingJob"> | number | null
    estimatedTokens?: IntNullableWithAggregatesFilter<"ProcessingJob"> | number | null
    estimatedCost?: FloatNullableWithAggregatesFilter<"ProcessingJob"> | number | null
    createdAt?: DateTimeWithAggregatesFilter<"ProcessingJob"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"ProcessingJob"> | Date | string
  }

  export type SettingWhereInput = {
    AND?: SettingWhereInput | SettingWhereInput[]
    OR?: SettingWhereInput[]
    NOT?: SettingWhereInput | SettingWhereInput[]
    key?: StringFilter<"Setting"> | string
    value?: StringFilter<"Setting"> | string
    category?: StringFilter<"Setting"> | string
    description?: StringNullableFilter<"Setting"> | string | null
    createdAt?: DateTimeFilter<"Setting"> | Date | string
    updatedAt?: DateTimeFilter<"Setting"> | Date | string
  }

  export type SettingOrderByWithRelationInput = {
    key?: SortOrder
    value?: SortOrder
    category?: SortOrder
    description?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type SettingWhereUniqueInput = Prisma.AtLeast<{
    key?: string
    AND?: SettingWhereInput | SettingWhereInput[]
    OR?: SettingWhereInput[]
    NOT?: SettingWhereInput | SettingWhereInput[]
    value?: StringFilter<"Setting"> | string
    category?: StringFilter<"Setting"> | string
    description?: StringNullableFilter<"Setting"> | string | null
    createdAt?: DateTimeFilter<"Setting"> | Date | string
    updatedAt?: DateTimeFilter<"Setting"> | Date | string
  }, "key">

  export type SettingOrderByWithAggregationInput = {
    key?: SortOrder
    value?: SortOrder
    category?: SortOrder
    description?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: SettingCountOrderByAggregateInput
    _max?: SettingMaxOrderByAggregateInput
    _min?: SettingMinOrderByAggregateInput
  }

  export type SettingScalarWhereWithAggregatesInput = {
    AND?: SettingScalarWhereWithAggregatesInput | SettingScalarWhereWithAggregatesInput[]
    OR?: SettingScalarWhereWithAggregatesInput[]
    NOT?: SettingScalarWhereWithAggregatesInput | SettingScalarWhereWithAggregatesInput[]
    key?: StringWithAggregatesFilter<"Setting"> | string
    value?: StringWithAggregatesFilter<"Setting"> | string
    category?: StringWithAggregatesFilter<"Setting"> | string
    description?: StringNullableWithAggregatesFilter<"Setting"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"Setting"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Setting"> | Date | string
  }

  export type AnalyticsEventWhereInput = {
    AND?: AnalyticsEventWhereInput | AnalyticsEventWhereInput[]
    OR?: AnalyticsEventWhereInput[]
    NOT?: AnalyticsEventWhereInput | AnalyticsEventWhereInput[]
    id?: StringFilter<"AnalyticsEvent"> | string
    eventType?: StringFilter<"AnalyticsEvent"> | string
    entityType?: StringFilter<"AnalyticsEvent"> | string
    entityId?: StringFilter<"AnalyticsEvent"> | string
    eventData?: StringNullableFilter<"AnalyticsEvent"> | string | null
    value?: FloatNullableFilter<"AnalyticsEvent"> | number | null
    occurredAt?: StringFilter<"AnalyticsEvent"> | string
    createdAt?: StringFilter<"AnalyticsEvent"> | string
  }

  export type AnalyticsEventOrderByWithRelationInput = {
    id?: SortOrder
    eventType?: SortOrder
    entityType?: SortOrder
    entityId?: SortOrder
    eventData?: SortOrderInput | SortOrder
    value?: SortOrderInput | SortOrder
    occurredAt?: SortOrder
    createdAt?: SortOrder
  }

  export type AnalyticsEventWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: AnalyticsEventWhereInput | AnalyticsEventWhereInput[]
    OR?: AnalyticsEventWhereInput[]
    NOT?: AnalyticsEventWhereInput | AnalyticsEventWhereInput[]
    eventType?: StringFilter<"AnalyticsEvent"> | string
    entityType?: StringFilter<"AnalyticsEvent"> | string
    entityId?: StringFilter<"AnalyticsEvent"> | string
    eventData?: StringNullableFilter<"AnalyticsEvent"> | string | null
    value?: FloatNullableFilter<"AnalyticsEvent"> | number | null
    occurredAt?: StringFilter<"AnalyticsEvent"> | string
    createdAt?: StringFilter<"AnalyticsEvent"> | string
  }, "id">

  export type AnalyticsEventOrderByWithAggregationInput = {
    id?: SortOrder
    eventType?: SortOrder
    entityType?: SortOrder
    entityId?: SortOrder
    eventData?: SortOrderInput | SortOrder
    value?: SortOrderInput | SortOrder
    occurredAt?: SortOrder
    createdAt?: SortOrder
    _count?: AnalyticsEventCountOrderByAggregateInput
    _avg?: AnalyticsEventAvgOrderByAggregateInput
    _max?: AnalyticsEventMaxOrderByAggregateInput
    _min?: AnalyticsEventMinOrderByAggregateInput
    _sum?: AnalyticsEventSumOrderByAggregateInput
  }

  export type AnalyticsEventScalarWhereWithAggregatesInput = {
    AND?: AnalyticsEventScalarWhereWithAggregatesInput | AnalyticsEventScalarWhereWithAggregatesInput[]
    OR?: AnalyticsEventScalarWhereWithAggregatesInput[]
    NOT?: AnalyticsEventScalarWhereWithAggregatesInput | AnalyticsEventScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"AnalyticsEvent"> | string
    eventType?: StringWithAggregatesFilter<"AnalyticsEvent"> | string
    entityType?: StringWithAggregatesFilter<"AnalyticsEvent"> | string
    entityId?: StringWithAggregatesFilter<"AnalyticsEvent"> | string
    eventData?: StringNullableWithAggregatesFilter<"AnalyticsEvent"> | string | null
    value?: FloatNullableWithAggregatesFilter<"AnalyticsEvent"> | number | null
    occurredAt?: StringWithAggregatesFilter<"AnalyticsEvent"> | string
    createdAt?: StringWithAggregatesFilter<"AnalyticsEvent"> | string
  }

  export type TranscriptCreateInput = {
    id?: string
    title: string
    rawContent: string
    cleanedContent?: string | null
    status?: string
    sourceType?: string | null
    sourceUrl?: string | null
    fileName?: string | null
    duration?: number | null
    wordCount?: number
    filePath?: string | null
    createdAt?: string
    updatedAt?: string
    insights?: InsightCreateNestedManyWithoutTranscriptInput
  }

  export type TranscriptUncheckedCreateInput = {
    id?: string
    title: string
    rawContent: string
    cleanedContent?: string | null
    status?: string
    sourceType?: string | null
    sourceUrl?: string | null
    fileName?: string | null
    duration?: number | null
    wordCount?: number
    filePath?: string | null
    createdAt?: string
    updatedAt?: string
    insights?: InsightUncheckedCreateNestedManyWithoutTranscriptInput
  }

  export type TranscriptUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    rawContent?: StringFieldUpdateOperationsInput | string
    cleanedContent?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    sourceType?: NullableStringFieldUpdateOperationsInput | string | null
    sourceUrl?: NullableStringFieldUpdateOperationsInput | string | null
    fileName?: NullableStringFieldUpdateOperationsInput | string | null
    duration?: NullableIntFieldUpdateOperationsInput | number | null
    wordCount?: IntFieldUpdateOperationsInput | number
    filePath?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: StringFieldUpdateOperationsInput | string
    updatedAt?: StringFieldUpdateOperationsInput | string
    insights?: InsightUpdateManyWithoutTranscriptNestedInput
  }

  export type TranscriptUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    rawContent?: StringFieldUpdateOperationsInput | string
    cleanedContent?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    sourceType?: NullableStringFieldUpdateOperationsInput | string | null
    sourceUrl?: NullableStringFieldUpdateOperationsInput | string | null
    fileName?: NullableStringFieldUpdateOperationsInput | string | null
    duration?: NullableIntFieldUpdateOperationsInput | number | null
    wordCount?: IntFieldUpdateOperationsInput | number
    filePath?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: StringFieldUpdateOperationsInput | string
    updatedAt?: StringFieldUpdateOperationsInput | string
    insights?: InsightUncheckedUpdateManyWithoutTranscriptNestedInput
  }

  export type TranscriptCreateManyInput = {
    id?: string
    title: string
    rawContent: string
    cleanedContent?: string | null
    status?: string
    sourceType?: string | null
    sourceUrl?: string | null
    fileName?: string | null
    duration?: number | null
    wordCount?: number
    filePath?: string | null
    createdAt?: string
    updatedAt?: string
  }

  export type TranscriptUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    rawContent?: StringFieldUpdateOperationsInput | string
    cleanedContent?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    sourceType?: NullableStringFieldUpdateOperationsInput | string | null
    sourceUrl?: NullableStringFieldUpdateOperationsInput | string | null
    fileName?: NullableStringFieldUpdateOperationsInput | string | null
    duration?: NullableIntFieldUpdateOperationsInput | number | null
    wordCount?: IntFieldUpdateOperationsInput | number
    filePath?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: StringFieldUpdateOperationsInput | string
    updatedAt?: StringFieldUpdateOperationsInput | string
  }

  export type TranscriptUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    rawContent?: StringFieldUpdateOperationsInput | string
    cleanedContent?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    sourceType?: NullableStringFieldUpdateOperationsInput | string | null
    sourceUrl?: NullableStringFieldUpdateOperationsInput | string | null
    fileName?: NullableStringFieldUpdateOperationsInput | string | null
    duration?: NullableIntFieldUpdateOperationsInput | number | null
    wordCount?: IntFieldUpdateOperationsInput | number
    filePath?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: StringFieldUpdateOperationsInput | string
    updatedAt?: StringFieldUpdateOperationsInput | string
  }

  export type InsightCreateInput = {
    id?: string
    title: string
    summary: string
    verbatimQuote: string
    category: string
    postType: string
    urgencyScore: number
    relatabilityScore: number
    specificityScore: number
    authorityScore: number
    totalScore: number
    status?: string
    processingDurationMs?: number | null
    estimatedTokens?: number | null
    estimatedCost?: number | null
    createdAt?: Date | string
    updatedAt?: Date | string
    transcript: TranscriptCreateNestedOneWithoutInsightsInput
    posts?: PostCreateNestedManyWithoutInsightInput
  }

  export type InsightUncheckedCreateInput = {
    id?: string
    cleanedTranscriptId: string
    title: string
    summary: string
    verbatimQuote: string
    category: string
    postType: string
    urgencyScore: number
    relatabilityScore: number
    specificityScore: number
    authorityScore: number
    totalScore: number
    status?: string
    processingDurationMs?: number | null
    estimatedTokens?: number | null
    estimatedCost?: number | null
    createdAt?: Date | string
    updatedAt?: Date | string
    posts?: PostUncheckedCreateNestedManyWithoutInsightInput
  }

  export type InsightUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    summary?: StringFieldUpdateOperationsInput | string
    verbatimQuote?: StringFieldUpdateOperationsInput | string
    category?: StringFieldUpdateOperationsInput | string
    postType?: StringFieldUpdateOperationsInput | string
    urgencyScore?: IntFieldUpdateOperationsInput | number
    relatabilityScore?: IntFieldUpdateOperationsInput | number
    specificityScore?: IntFieldUpdateOperationsInput | number
    authorityScore?: IntFieldUpdateOperationsInput | number
    totalScore?: IntFieldUpdateOperationsInput | number
    status?: StringFieldUpdateOperationsInput | string
    processingDurationMs?: NullableIntFieldUpdateOperationsInput | number | null
    estimatedTokens?: NullableIntFieldUpdateOperationsInput | number | null
    estimatedCost?: NullableFloatFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    transcript?: TranscriptUpdateOneRequiredWithoutInsightsNestedInput
    posts?: PostUpdateManyWithoutInsightNestedInput
  }

  export type InsightUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    cleanedTranscriptId?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    summary?: StringFieldUpdateOperationsInput | string
    verbatimQuote?: StringFieldUpdateOperationsInput | string
    category?: StringFieldUpdateOperationsInput | string
    postType?: StringFieldUpdateOperationsInput | string
    urgencyScore?: IntFieldUpdateOperationsInput | number
    relatabilityScore?: IntFieldUpdateOperationsInput | number
    specificityScore?: IntFieldUpdateOperationsInput | number
    authorityScore?: IntFieldUpdateOperationsInput | number
    totalScore?: IntFieldUpdateOperationsInput | number
    status?: StringFieldUpdateOperationsInput | string
    processingDurationMs?: NullableIntFieldUpdateOperationsInput | number | null
    estimatedTokens?: NullableIntFieldUpdateOperationsInput | number | null
    estimatedCost?: NullableFloatFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    posts?: PostUncheckedUpdateManyWithoutInsightNestedInput
  }

  export type InsightCreateManyInput = {
    id?: string
    cleanedTranscriptId: string
    title: string
    summary: string
    verbatimQuote: string
    category: string
    postType: string
    urgencyScore: number
    relatabilityScore: number
    specificityScore: number
    authorityScore: number
    totalScore: number
    status?: string
    processingDurationMs?: number | null
    estimatedTokens?: number | null
    estimatedCost?: number | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type InsightUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    summary?: StringFieldUpdateOperationsInput | string
    verbatimQuote?: StringFieldUpdateOperationsInput | string
    category?: StringFieldUpdateOperationsInput | string
    postType?: StringFieldUpdateOperationsInput | string
    urgencyScore?: IntFieldUpdateOperationsInput | number
    relatabilityScore?: IntFieldUpdateOperationsInput | number
    specificityScore?: IntFieldUpdateOperationsInput | number
    authorityScore?: IntFieldUpdateOperationsInput | number
    totalScore?: IntFieldUpdateOperationsInput | number
    status?: StringFieldUpdateOperationsInput | string
    processingDurationMs?: NullableIntFieldUpdateOperationsInput | number | null
    estimatedTokens?: NullableIntFieldUpdateOperationsInput | number | null
    estimatedCost?: NullableFloatFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type InsightUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    cleanedTranscriptId?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    summary?: StringFieldUpdateOperationsInput | string
    verbatimQuote?: StringFieldUpdateOperationsInput | string
    category?: StringFieldUpdateOperationsInput | string
    postType?: StringFieldUpdateOperationsInput | string
    urgencyScore?: IntFieldUpdateOperationsInput | number
    relatabilityScore?: IntFieldUpdateOperationsInput | number
    specificityScore?: IntFieldUpdateOperationsInput | number
    authorityScore?: IntFieldUpdateOperationsInput | number
    totalScore?: IntFieldUpdateOperationsInput | number
    status?: StringFieldUpdateOperationsInput | string
    processingDurationMs?: NullableIntFieldUpdateOperationsInput | number | null
    estimatedTokens?: NullableIntFieldUpdateOperationsInput | number | null
    estimatedCost?: NullableFloatFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PostCreateInput = {
    id?: string
    title: string
    platform: string
    content: string
    status?: string
    characterCount?: number | null
    createdAt?: string
    updatedAt?: string
    insight: InsightCreateNestedOneWithoutPostsInput
    scheduledPosts?: ScheduledPostCreateNestedManyWithoutPostInput
  }

  export type PostUncheckedCreateInput = {
    id?: string
    insightId: string
    title: string
    platform: string
    content: string
    status?: string
    characterCount?: number | null
    createdAt?: string
    updatedAt?: string
    scheduledPosts?: ScheduledPostUncheckedCreateNestedManyWithoutPostInput
  }

  export type PostUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    platform?: StringFieldUpdateOperationsInput | string
    content?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    characterCount?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: StringFieldUpdateOperationsInput | string
    updatedAt?: StringFieldUpdateOperationsInput | string
    insight?: InsightUpdateOneRequiredWithoutPostsNestedInput
    scheduledPosts?: ScheduledPostUpdateManyWithoutPostNestedInput
  }

  export type PostUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    insightId?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    platform?: StringFieldUpdateOperationsInput | string
    content?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    characterCount?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: StringFieldUpdateOperationsInput | string
    updatedAt?: StringFieldUpdateOperationsInput | string
    scheduledPosts?: ScheduledPostUncheckedUpdateManyWithoutPostNestedInput
  }

  export type PostCreateManyInput = {
    id?: string
    insightId: string
    title: string
    platform: string
    content: string
    status?: string
    characterCount?: number | null
    createdAt?: string
    updatedAt?: string
  }

  export type PostUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    platform?: StringFieldUpdateOperationsInput | string
    content?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    characterCount?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: StringFieldUpdateOperationsInput | string
    updatedAt?: StringFieldUpdateOperationsInput | string
  }

  export type PostUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    insightId?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    platform?: StringFieldUpdateOperationsInput | string
    content?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    characterCount?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: StringFieldUpdateOperationsInput | string
    updatedAt?: StringFieldUpdateOperationsInput | string
  }

  export type ScheduledPostCreateInput = {
    id?: string
    platform: string
    content: string
    scheduledTime: string
    status?: string
    retryCount?: number
    lastAttempt?: string | null
    errorMessage?: string | null
    externalPostId?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    post: PostCreateNestedOneWithoutScheduledPostsInput
  }

  export type ScheduledPostUncheckedCreateInput = {
    id?: string
    postId: string
    platform: string
    content: string
    scheduledTime: string
    status?: string
    retryCount?: number
    lastAttempt?: string | null
    errorMessage?: string | null
    externalPostId?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ScheduledPostUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    platform?: StringFieldUpdateOperationsInput | string
    content?: StringFieldUpdateOperationsInput | string
    scheduledTime?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    retryCount?: IntFieldUpdateOperationsInput | number
    lastAttempt?: NullableStringFieldUpdateOperationsInput | string | null
    errorMessage?: NullableStringFieldUpdateOperationsInput | string | null
    externalPostId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    post?: PostUpdateOneRequiredWithoutScheduledPostsNestedInput
  }

  export type ScheduledPostUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    postId?: StringFieldUpdateOperationsInput | string
    platform?: StringFieldUpdateOperationsInput | string
    content?: StringFieldUpdateOperationsInput | string
    scheduledTime?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    retryCount?: IntFieldUpdateOperationsInput | number
    lastAttempt?: NullableStringFieldUpdateOperationsInput | string | null
    errorMessage?: NullableStringFieldUpdateOperationsInput | string | null
    externalPostId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ScheduledPostCreateManyInput = {
    id?: string
    postId: string
    platform: string
    content: string
    scheduledTime: string
    status?: string
    retryCount?: number
    lastAttempt?: string | null
    errorMessage?: string | null
    externalPostId?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ScheduledPostUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    platform?: StringFieldUpdateOperationsInput | string
    content?: StringFieldUpdateOperationsInput | string
    scheduledTime?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    retryCount?: IntFieldUpdateOperationsInput | number
    lastAttempt?: NullableStringFieldUpdateOperationsInput | string | null
    errorMessage?: NullableStringFieldUpdateOperationsInput | string | null
    externalPostId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ScheduledPostUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    postId?: StringFieldUpdateOperationsInput | string
    platform?: StringFieldUpdateOperationsInput | string
    content?: StringFieldUpdateOperationsInput | string
    scheduledTime?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    retryCount?: IntFieldUpdateOperationsInput | number
    lastAttempt?: NullableStringFieldUpdateOperationsInput | string | null
    errorMessage?: NullableStringFieldUpdateOperationsInput | string | null
    externalPostId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ProcessingJobCreateInput = {
    id?: string
    jobType: string
    sourceId: string
    status?: string
    progress?: number
    resultCount?: number
    errorMessage?: string | null
    startedAt?: string | null
    completedAt?: string | null
    durationMs?: number | null
    estimatedTokens?: number | null
    estimatedCost?: number | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ProcessingJobUncheckedCreateInput = {
    id?: string
    jobType: string
    sourceId: string
    status?: string
    progress?: number
    resultCount?: number
    errorMessage?: string | null
    startedAt?: string | null
    completedAt?: string | null
    durationMs?: number | null
    estimatedTokens?: number | null
    estimatedCost?: number | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ProcessingJobUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    jobType?: StringFieldUpdateOperationsInput | string
    sourceId?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    progress?: IntFieldUpdateOperationsInput | number
    resultCount?: IntFieldUpdateOperationsInput | number
    errorMessage?: NullableStringFieldUpdateOperationsInput | string | null
    startedAt?: NullableStringFieldUpdateOperationsInput | string | null
    completedAt?: NullableStringFieldUpdateOperationsInput | string | null
    durationMs?: NullableIntFieldUpdateOperationsInput | number | null
    estimatedTokens?: NullableIntFieldUpdateOperationsInput | number | null
    estimatedCost?: NullableFloatFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ProcessingJobUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    jobType?: StringFieldUpdateOperationsInput | string
    sourceId?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    progress?: IntFieldUpdateOperationsInput | number
    resultCount?: IntFieldUpdateOperationsInput | number
    errorMessage?: NullableStringFieldUpdateOperationsInput | string | null
    startedAt?: NullableStringFieldUpdateOperationsInput | string | null
    completedAt?: NullableStringFieldUpdateOperationsInput | string | null
    durationMs?: NullableIntFieldUpdateOperationsInput | number | null
    estimatedTokens?: NullableIntFieldUpdateOperationsInput | number | null
    estimatedCost?: NullableFloatFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ProcessingJobCreateManyInput = {
    id?: string
    jobType: string
    sourceId: string
    status?: string
    progress?: number
    resultCount?: number
    errorMessage?: string | null
    startedAt?: string | null
    completedAt?: string | null
    durationMs?: number | null
    estimatedTokens?: number | null
    estimatedCost?: number | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ProcessingJobUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    jobType?: StringFieldUpdateOperationsInput | string
    sourceId?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    progress?: IntFieldUpdateOperationsInput | number
    resultCount?: IntFieldUpdateOperationsInput | number
    errorMessage?: NullableStringFieldUpdateOperationsInput | string | null
    startedAt?: NullableStringFieldUpdateOperationsInput | string | null
    completedAt?: NullableStringFieldUpdateOperationsInput | string | null
    durationMs?: NullableIntFieldUpdateOperationsInput | number | null
    estimatedTokens?: NullableIntFieldUpdateOperationsInput | number | null
    estimatedCost?: NullableFloatFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ProcessingJobUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    jobType?: StringFieldUpdateOperationsInput | string
    sourceId?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    progress?: IntFieldUpdateOperationsInput | number
    resultCount?: IntFieldUpdateOperationsInput | number
    errorMessage?: NullableStringFieldUpdateOperationsInput | string | null
    startedAt?: NullableStringFieldUpdateOperationsInput | string | null
    completedAt?: NullableStringFieldUpdateOperationsInput | string | null
    durationMs?: NullableIntFieldUpdateOperationsInput | number | null
    estimatedTokens?: NullableIntFieldUpdateOperationsInput | number | null
    estimatedCost?: NullableFloatFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SettingCreateInput = {
    key: string
    value: string
    category?: string
    description?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type SettingUncheckedCreateInput = {
    key: string
    value: string
    category?: string
    description?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type SettingUpdateInput = {
    key?: StringFieldUpdateOperationsInput | string
    value?: StringFieldUpdateOperationsInput | string
    category?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SettingUncheckedUpdateInput = {
    key?: StringFieldUpdateOperationsInput | string
    value?: StringFieldUpdateOperationsInput | string
    category?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SettingCreateManyInput = {
    key: string
    value: string
    category?: string
    description?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type SettingUpdateManyMutationInput = {
    key?: StringFieldUpdateOperationsInput | string
    value?: StringFieldUpdateOperationsInput | string
    category?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SettingUncheckedUpdateManyInput = {
    key?: StringFieldUpdateOperationsInput | string
    value?: StringFieldUpdateOperationsInput | string
    category?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AnalyticsEventCreateInput = {
    id?: string
    eventType: string
    entityType: string
    entityId: string
    eventData?: string | null
    value?: number | null
    occurredAt: string
    createdAt: string
  }

  export type AnalyticsEventUncheckedCreateInput = {
    id?: string
    eventType: string
    entityType: string
    entityId: string
    eventData?: string | null
    value?: number | null
    occurredAt: string
    createdAt: string
  }

  export type AnalyticsEventUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    eventType?: StringFieldUpdateOperationsInput | string
    entityType?: StringFieldUpdateOperationsInput | string
    entityId?: StringFieldUpdateOperationsInput | string
    eventData?: NullableStringFieldUpdateOperationsInput | string | null
    value?: NullableFloatFieldUpdateOperationsInput | number | null
    occurredAt?: StringFieldUpdateOperationsInput | string
    createdAt?: StringFieldUpdateOperationsInput | string
  }

  export type AnalyticsEventUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    eventType?: StringFieldUpdateOperationsInput | string
    entityType?: StringFieldUpdateOperationsInput | string
    entityId?: StringFieldUpdateOperationsInput | string
    eventData?: NullableStringFieldUpdateOperationsInput | string | null
    value?: NullableFloatFieldUpdateOperationsInput | number | null
    occurredAt?: StringFieldUpdateOperationsInput | string
    createdAt?: StringFieldUpdateOperationsInput | string
  }

  export type AnalyticsEventCreateManyInput = {
    id?: string
    eventType: string
    entityType: string
    entityId: string
    eventData?: string | null
    value?: number | null
    occurredAt: string
    createdAt: string
  }

  export type AnalyticsEventUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    eventType?: StringFieldUpdateOperationsInput | string
    entityType?: StringFieldUpdateOperationsInput | string
    entityId?: StringFieldUpdateOperationsInput | string
    eventData?: NullableStringFieldUpdateOperationsInput | string | null
    value?: NullableFloatFieldUpdateOperationsInput | number | null
    occurredAt?: StringFieldUpdateOperationsInput | string
    createdAt?: StringFieldUpdateOperationsInput | string
  }

  export type AnalyticsEventUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    eventType?: StringFieldUpdateOperationsInput | string
    entityType?: StringFieldUpdateOperationsInput | string
    entityId?: StringFieldUpdateOperationsInput | string
    eventData?: NullableStringFieldUpdateOperationsInput | string | null
    value?: NullableFloatFieldUpdateOperationsInput | number | null
    occurredAt?: StringFieldUpdateOperationsInput | string
    createdAt?: StringFieldUpdateOperationsInput | string
  }

  export type StringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[]
    notIn?: string[]
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type StringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | null
    notIn?: string[] | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type IntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type IntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type InsightListRelationFilter = {
    every?: InsightWhereInput
    some?: InsightWhereInput
    none?: InsightWhereInput
  }

  export type SortOrderInput = {
    sort: SortOrder
    nulls?: NullsOrder
  }

  export type InsightOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type TranscriptCountOrderByAggregateInput = {
    id?: SortOrder
    title?: SortOrder
    rawContent?: SortOrder
    cleanedContent?: SortOrder
    status?: SortOrder
    sourceType?: SortOrder
    sourceUrl?: SortOrder
    fileName?: SortOrder
    duration?: SortOrder
    wordCount?: SortOrder
    filePath?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type TranscriptAvgOrderByAggregateInput = {
    duration?: SortOrder
    wordCount?: SortOrder
  }

  export type TranscriptMaxOrderByAggregateInput = {
    id?: SortOrder
    title?: SortOrder
    rawContent?: SortOrder
    cleanedContent?: SortOrder
    status?: SortOrder
    sourceType?: SortOrder
    sourceUrl?: SortOrder
    fileName?: SortOrder
    duration?: SortOrder
    wordCount?: SortOrder
    filePath?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type TranscriptMinOrderByAggregateInput = {
    id?: SortOrder
    title?: SortOrder
    rawContent?: SortOrder
    cleanedContent?: SortOrder
    status?: SortOrder
    sourceType?: SortOrder
    sourceUrl?: SortOrder
    fileName?: SortOrder
    duration?: SortOrder
    wordCount?: SortOrder
    filePath?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type TranscriptSumOrderByAggregateInput = {
    duration?: SortOrder
    wordCount?: SortOrder
  }

  export type StringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[]
    notIn?: string[]
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type StringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | null
    notIn?: string[] | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type IntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedIntNullableFilter<$PrismaModel>
    _max?: NestedIntNullableFilter<$PrismaModel>
  }

  export type IntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type FloatNullableFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableFilter<$PrismaModel> | number | null
  }

  export type DateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[]
    notIn?: Date[] | string[]
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type TranscriptScalarRelationFilter = {
    is?: TranscriptWhereInput
    isNot?: TranscriptWhereInput
  }

  export type PostListRelationFilter = {
    every?: PostWhereInput
    some?: PostWhereInput
    none?: PostWhereInput
  }

  export type PostOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type InsightCountOrderByAggregateInput = {
    id?: SortOrder
    cleanedTranscriptId?: SortOrder
    title?: SortOrder
    summary?: SortOrder
    verbatimQuote?: SortOrder
    category?: SortOrder
    postType?: SortOrder
    urgencyScore?: SortOrder
    relatabilityScore?: SortOrder
    specificityScore?: SortOrder
    authorityScore?: SortOrder
    totalScore?: SortOrder
    status?: SortOrder
    processingDurationMs?: SortOrder
    estimatedTokens?: SortOrder
    estimatedCost?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type InsightAvgOrderByAggregateInput = {
    urgencyScore?: SortOrder
    relatabilityScore?: SortOrder
    specificityScore?: SortOrder
    authorityScore?: SortOrder
    totalScore?: SortOrder
    processingDurationMs?: SortOrder
    estimatedTokens?: SortOrder
    estimatedCost?: SortOrder
  }

  export type InsightMaxOrderByAggregateInput = {
    id?: SortOrder
    cleanedTranscriptId?: SortOrder
    title?: SortOrder
    summary?: SortOrder
    verbatimQuote?: SortOrder
    category?: SortOrder
    postType?: SortOrder
    urgencyScore?: SortOrder
    relatabilityScore?: SortOrder
    specificityScore?: SortOrder
    authorityScore?: SortOrder
    totalScore?: SortOrder
    status?: SortOrder
    processingDurationMs?: SortOrder
    estimatedTokens?: SortOrder
    estimatedCost?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type InsightMinOrderByAggregateInput = {
    id?: SortOrder
    cleanedTranscriptId?: SortOrder
    title?: SortOrder
    summary?: SortOrder
    verbatimQuote?: SortOrder
    category?: SortOrder
    postType?: SortOrder
    urgencyScore?: SortOrder
    relatabilityScore?: SortOrder
    specificityScore?: SortOrder
    authorityScore?: SortOrder
    totalScore?: SortOrder
    status?: SortOrder
    processingDurationMs?: SortOrder
    estimatedTokens?: SortOrder
    estimatedCost?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type InsightSumOrderByAggregateInput = {
    urgencyScore?: SortOrder
    relatabilityScore?: SortOrder
    specificityScore?: SortOrder
    authorityScore?: SortOrder
    totalScore?: SortOrder
    processingDurationMs?: SortOrder
    estimatedTokens?: SortOrder
    estimatedCost?: SortOrder
  }

  export type FloatNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedFloatNullableFilter<$PrismaModel>
    _min?: NestedFloatNullableFilter<$PrismaModel>
    _max?: NestedFloatNullableFilter<$PrismaModel>
  }

  export type DateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[]
    notIn?: Date[] | string[]
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type InsightScalarRelationFilter = {
    is?: InsightWhereInput
    isNot?: InsightWhereInput
  }

  export type ScheduledPostListRelationFilter = {
    every?: ScheduledPostWhereInput
    some?: ScheduledPostWhereInput
    none?: ScheduledPostWhereInput
  }

  export type ScheduledPostOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type PostCountOrderByAggregateInput = {
    id?: SortOrder
    insightId?: SortOrder
    title?: SortOrder
    platform?: SortOrder
    content?: SortOrder
    status?: SortOrder
    characterCount?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type PostAvgOrderByAggregateInput = {
    characterCount?: SortOrder
  }

  export type PostMaxOrderByAggregateInput = {
    id?: SortOrder
    insightId?: SortOrder
    title?: SortOrder
    platform?: SortOrder
    content?: SortOrder
    status?: SortOrder
    characterCount?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type PostMinOrderByAggregateInput = {
    id?: SortOrder
    insightId?: SortOrder
    title?: SortOrder
    platform?: SortOrder
    content?: SortOrder
    status?: SortOrder
    characterCount?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type PostSumOrderByAggregateInput = {
    characterCount?: SortOrder
  }

  export type PostScalarRelationFilter = {
    is?: PostWhereInput
    isNot?: PostWhereInput
  }

  export type ScheduledPostCountOrderByAggregateInput = {
    id?: SortOrder
    postId?: SortOrder
    platform?: SortOrder
    content?: SortOrder
    scheduledTime?: SortOrder
    status?: SortOrder
    retryCount?: SortOrder
    lastAttempt?: SortOrder
    errorMessage?: SortOrder
    externalPostId?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type ScheduledPostAvgOrderByAggregateInput = {
    retryCount?: SortOrder
  }

  export type ScheduledPostMaxOrderByAggregateInput = {
    id?: SortOrder
    postId?: SortOrder
    platform?: SortOrder
    content?: SortOrder
    scheduledTime?: SortOrder
    status?: SortOrder
    retryCount?: SortOrder
    lastAttempt?: SortOrder
    errorMessage?: SortOrder
    externalPostId?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type ScheduledPostMinOrderByAggregateInput = {
    id?: SortOrder
    postId?: SortOrder
    platform?: SortOrder
    content?: SortOrder
    scheduledTime?: SortOrder
    status?: SortOrder
    retryCount?: SortOrder
    lastAttempt?: SortOrder
    errorMessage?: SortOrder
    externalPostId?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type ScheduledPostSumOrderByAggregateInput = {
    retryCount?: SortOrder
  }

  export type ProcessingJobCountOrderByAggregateInput = {
    id?: SortOrder
    jobType?: SortOrder
    sourceId?: SortOrder
    status?: SortOrder
    progress?: SortOrder
    resultCount?: SortOrder
    errorMessage?: SortOrder
    startedAt?: SortOrder
    completedAt?: SortOrder
    durationMs?: SortOrder
    estimatedTokens?: SortOrder
    estimatedCost?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type ProcessingJobAvgOrderByAggregateInput = {
    progress?: SortOrder
    resultCount?: SortOrder
    durationMs?: SortOrder
    estimatedTokens?: SortOrder
    estimatedCost?: SortOrder
  }

  export type ProcessingJobMaxOrderByAggregateInput = {
    id?: SortOrder
    jobType?: SortOrder
    sourceId?: SortOrder
    status?: SortOrder
    progress?: SortOrder
    resultCount?: SortOrder
    errorMessage?: SortOrder
    startedAt?: SortOrder
    completedAt?: SortOrder
    durationMs?: SortOrder
    estimatedTokens?: SortOrder
    estimatedCost?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type ProcessingJobMinOrderByAggregateInput = {
    id?: SortOrder
    jobType?: SortOrder
    sourceId?: SortOrder
    status?: SortOrder
    progress?: SortOrder
    resultCount?: SortOrder
    errorMessage?: SortOrder
    startedAt?: SortOrder
    completedAt?: SortOrder
    durationMs?: SortOrder
    estimatedTokens?: SortOrder
    estimatedCost?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type ProcessingJobSumOrderByAggregateInput = {
    progress?: SortOrder
    resultCount?: SortOrder
    durationMs?: SortOrder
    estimatedTokens?: SortOrder
    estimatedCost?: SortOrder
  }

  export type SettingCountOrderByAggregateInput = {
    key?: SortOrder
    value?: SortOrder
    category?: SortOrder
    description?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type SettingMaxOrderByAggregateInput = {
    key?: SortOrder
    value?: SortOrder
    category?: SortOrder
    description?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type SettingMinOrderByAggregateInput = {
    key?: SortOrder
    value?: SortOrder
    category?: SortOrder
    description?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type AnalyticsEventCountOrderByAggregateInput = {
    id?: SortOrder
    eventType?: SortOrder
    entityType?: SortOrder
    entityId?: SortOrder
    eventData?: SortOrder
    value?: SortOrder
    occurredAt?: SortOrder
    createdAt?: SortOrder
  }

  export type AnalyticsEventAvgOrderByAggregateInput = {
    value?: SortOrder
  }

  export type AnalyticsEventMaxOrderByAggregateInput = {
    id?: SortOrder
    eventType?: SortOrder
    entityType?: SortOrder
    entityId?: SortOrder
    eventData?: SortOrder
    value?: SortOrder
    occurredAt?: SortOrder
    createdAt?: SortOrder
  }

  export type AnalyticsEventMinOrderByAggregateInput = {
    id?: SortOrder
    eventType?: SortOrder
    entityType?: SortOrder
    entityId?: SortOrder
    eventData?: SortOrder
    value?: SortOrder
    occurredAt?: SortOrder
    createdAt?: SortOrder
  }

  export type AnalyticsEventSumOrderByAggregateInput = {
    value?: SortOrder
  }

  export type InsightCreateNestedManyWithoutTranscriptInput = {
    create?: XOR<InsightCreateWithoutTranscriptInput, InsightUncheckedCreateWithoutTranscriptInput> | InsightCreateWithoutTranscriptInput[] | InsightUncheckedCreateWithoutTranscriptInput[]
    connectOrCreate?: InsightCreateOrConnectWithoutTranscriptInput | InsightCreateOrConnectWithoutTranscriptInput[]
    createMany?: InsightCreateManyTranscriptInputEnvelope
    connect?: InsightWhereUniqueInput | InsightWhereUniqueInput[]
  }

  export type InsightUncheckedCreateNestedManyWithoutTranscriptInput = {
    create?: XOR<InsightCreateWithoutTranscriptInput, InsightUncheckedCreateWithoutTranscriptInput> | InsightCreateWithoutTranscriptInput[] | InsightUncheckedCreateWithoutTranscriptInput[]
    connectOrCreate?: InsightCreateOrConnectWithoutTranscriptInput | InsightCreateOrConnectWithoutTranscriptInput[]
    createMany?: InsightCreateManyTranscriptInputEnvelope
    connect?: InsightWhereUniqueInput | InsightWhereUniqueInput[]
  }

  export type StringFieldUpdateOperationsInput = {
    set?: string
  }

  export type NullableStringFieldUpdateOperationsInput = {
    set?: string | null
  }

  export type NullableIntFieldUpdateOperationsInput = {
    set?: number | null
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type IntFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type InsightUpdateManyWithoutTranscriptNestedInput = {
    create?: XOR<InsightCreateWithoutTranscriptInput, InsightUncheckedCreateWithoutTranscriptInput> | InsightCreateWithoutTranscriptInput[] | InsightUncheckedCreateWithoutTranscriptInput[]
    connectOrCreate?: InsightCreateOrConnectWithoutTranscriptInput | InsightCreateOrConnectWithoutTranscriptInput[]
    upsert?: InsightUpsertWithWhereUniqueWithoutTranscriptInput | InsightUpsertWithWhereUniqueWithoutTranscriptInput[]
    createMany?: InsightCreateManyTranscriptInputEnvelope
    set?: InsightWhereUniqueInput | InsightWhereUniqueInput[]
    disconnect?: InsightWhereUniqueInput | InsightWhereUniqueInput[]
    delete?: InsightWhereUniqueInput | InsightWhereUniqueInput[]
    connect?: InsightWhereUniqueInput | InsightWhereUniqueInput[]
    update?: InsightUpdateWithWhereUniqueWithoutTranscriptInput | InsightUpdateWithWhereUniqueWithoutTranscriptInput[]
    updateMany?: InsightUpdateManyWithWhereWithoutTranscriptInput | InsightUpdateManyWithWhereWithoutTranscriptInput[]
    deleteMany?: InsightScalarWhereInput | InsightScalarWhereInput[]
  }

  export type InsightUncheckedUpdateManyWithoutTranscriptNestedInput = {
    create?: XOR<InsightCreateWithoutTranscriptInput, InsightUncheckedCreateWithoutTranscriptInput> | InsightCreateWithoutTranscriptInput[] | InsightUncheckedCreateWithoutTranscriptInput[]
    connectOrCreate?: InsightCreateOrConnectWithoutTranscriptInput | InsightCreateOrConnectWithoutTranscriptInput[]
    upsert?: InsightUpsertWithWhereUniqueWithoutTranscriptInput | InsightUpsertWithWhereUniqueWithoutTranscriptInput[]
    createMany?: InsightCreateManyTranscriptInputEnvelope
    set?: InsightWhereUniqueInput | InsightWhereUniqueInput[]
    disconnect?: InsightWhereUniqueInput | InsightWhereUniqueInput[]
    delete?: InsightWhereUniqueInput | InsightWhereUniqueInput[]
    connect?: InsightWhereUniqueInput | InsightWhereUniqueInput[]
    update?: InsightUpdateWithWhereUniqueWithoutTranscriptInput | InsightUpdateWithWhereUniqueWithoutTranscriptInput[]
    updateMany?: InsightUpdateManyWithWhereWithoutTranscriptInput | InsightUpdateManyWithWhereWithoutTranscriptInput[]
    deleteMany?: InsightScalarWhereInput | InsightScalarWhereInput[]
  }

  export type TranscriptCreateNestedOneWithoutInsightsInput = {
    create?: XOR<TranscriptCreateWithoutInsightsInput, TranscriptUncheckedCreateWithoutInsightsInput>
    connectOrCreate?: TranscriptCreateOrConnectWithoutInsightsInput
    connect?: TranscriptWhereUniqueInput
  }

  export type PostCreateNestedManyWithoutInsightInput = {
    create?: XOR<PostCreateWithoutInsightInput, PostUncheckedCreateWithoutInsightInput> | PostCreateWithoutInsightInput[] | PostUncheckedCreateWithoutInsightInput[]
    connectOrCreate?: PostCreateOrConnectWithoutInsightInput | PostCreateOrConnectWithoutInsightInput[]
    createMany?: PostCreateManyInsightInputEnvelope
    connect?: PostWhereUniqueInput | PostWhereUniqueInput[]
  }

  export type PostUncheckedCreateNestedManyWithoutInsightInput = {
    create?: XOR<PostCreateWithoutInsightInput, PostUncheckedCreateWithoutInsightInput> | PostCreateWithoutInsightInput[] | PostUncheckedCreateWithoutInsightInput[]
    connectOrCreate?: PostCreateOrConnectWithoutInsightInput | PostCreateOrConnectWithoutInsightInput[]
    createMany?: PostCreateManyInsightInputEnvelope
    connect?: PostWhereUniqueInput | PostWhereUniqueInput[]
  }

  export type NullableFloatFieldUpdateOperationsInput = {
    set?: number | null
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type DateTimeFieldUpdateOperationsInput = {
    set?: Date | string
  }

  export type TranscriptUpdateOneRequiredWithoutInsightsNestedInput = {
    create?: XOR<TranscriptCreateWithoutInsightsInput, TranscriptUncheckedCreateWithoutInsightsInput>
    connectOrCreate?: TranscriptCreateOrConnectWithoutInsightsInput
    upsert?: TranscriptUpsertWithoutInsightsInput
    connect?: TranscriptWhereUniqueInput
    update?: XOR<XOR<TranscriptUpdateToOneWithWhereWithoutInsightsInput, TranscriptUpdateWithoutInsightsInput>, TranscriptUncheckedUpdateWithoutInsightsInput>
  }

  export type PostUpdateManyWithoutInsightNestedInput = {
    create?: XOR<PostCreateWithoutInsightInput, PostUncheckedCreateWithoutInsightInput> | PostCreateWithoutInsightInput[] | PostUncheckedCreateWithoutInsightInput[]
    connectOrCreate?: PostCreateOrConnectWithoutInsightInput | PostCreateOrConnectWithoutInsightInput[]
    upsert?: PostUpsertWithWhereUniqueWithoutInsightInput | PostUpsertWithWhereUniqueWithoutInsightInput[]
    createMany?: PostCreateManyInsightInputEnvelope
    set?: PostWhereUniqueInput | PostWhereUniqueInput[]
    disconnect?: PostWhereUniqueInput | PostWhereUniqueInput[]
    delete?: PostWhereUniqueInput | PostWhereUniqueInput[]
    connect?: PostWhereUniqueInput | PostWhereUniqueInput[]
    update?: PostUpdateWithWhereUniqueWithoutInsightInput | PostUpdateWithWhereUniqueWithoutInsightInput[]
    updateMany?: PostUpdateManyWithWhereWithoutInsightInput | PostUpdateManyWithWhereWithoutInsightInput[]
    deleteMany?: PostScalarWhereInput | PostScalarWhereInput[]
  }

  export type PostUncheckedUpdateManyWithoutInsightNestedInput = {
    create?: XOR<PostCreateWithoutInsightInput, PostUncheckedCreateWithoutInsightInput> | PostCreateWithoutInsightInput[] | PostUncheckedCreateWithoutInsightInput[]
    connectOrCreate?: PostCreateOrConnectWithoutInsightInput | PostCreateOrConnectWithoutInsightInput[]
    upsert?: PostUpsertWithWhereUniqueWithoutInsightInput | PostUpsertWithWhereUniqueWithoutInsightInput[]
    createMany?: PostCreateManyInsightInputEnvelope
    set?: PostWhereUniqueInput | PostWhereUniqueInput[]
    disconnect?: PostWhereUniqueInput | PostWhereUniqueInput[]
    delete?: PostWhereUniqueInput | PostWhereUniqueInput[]
    connect?: PostWhereUniqueInput | PostWhereUniqueInput[]
    update?: PostUpdateWithWhereUniqueWithoutInsightInput | PostUpdateWithWhereUniqueWithoutInsightInput[]
    updateMany?: PostUpdateManyWithWhereWithoutInsightInput | PostUpdateManyWithWhereWithoutInsightInput[]
    deleteMany?: PostScalarWhereInput | PostScalarWhereInput[]
  }

  export type InsightCreateNestedOneWithoutPostsInput = {
    create?: XOR<InsightCreateWithoutPostsInput, InsightUncheckedCreateWithoutPostsInput>
    connectOrCreate?: InsightCreateOrConnectWithoutPostsInput
    connect?: InsightWhereUniqueInput
  }

  export type ScheduledPostCreateNestedManyWithoutPostInput = {
    create?: XOR<ScheduledPostCreateWithoutPostInput, ScheduledPostUncheckedCreateWithoutPostInput> | ScheduledPostCreateWithoutPostInput[] | ScheduledPostUncheckedCreateWithoutPostInput[]
    connectOrCreate?: ScheduledPostCreateOrConnectWithoutPostInput | ScheduledPostCreateOrConnectWithoutPostInput[]
    createMany?: ScheduledPostCreateManyPostInputEnvelope
    connect?: ScheduledPostWhereUniqueInput | ScheduledPostWhereUniqueInput[]
  }

  export type ScheduledPostUncheckedCreateNestedManyWithoutPostInput = {
    create?: XOR<ScheduledPostCreateWithoutPostInput, ScheduledPostUncheckedCreateWithoutPostInput> | ScheduledPostCreateWithoutPostInput[] | ScheduledPostUncheckedCreateWithoutPostInput[]
    connectOrCreate?: ScheduledPostCreateOrConnectWithoutPostInput | ScheduledPostCreateOrConnectWithoutPostInput[]
    createMany?: ScheduledPostCreateManyPostInputEnvelope
    connect?: ScheduledPostWhereUniqueInput | ScheduledPostWhereUniqueInput[]
  }

  export type InsightUpdateOneRequiredWithoutPostsNestedInput = {
    create?: XOR<InsightCreateWithoutPostsInput, InsightUncheckedCreateWithoutPostsInput>
    connectOrCreate?: InsightCreateOrConnectWithoutPostsInput
    upsert?: InsightUpsertWithoutPostsInput
    connect?: InsightWhereUniqueInput
    update?: XOR<XOR<InsightUpdateToOneWithWhereWithoutPostsInput, InsightUpdateWithoutPostsInput>, InsightUncheckedUpdateWithoutPostsInput>
  }

  export type ScheduledPostUpdateManyWithoutPostNestedInput = {
    create?: XOR<ScheduledPostCreateWithoutPostInput, ScheduledPostUncheckedCreateWithoutPostInput> | ScheduledPostCreateWithoutPostInput[] | ScheduledPostUncheckedCreateWithoutPostInput[]
    connectOrCreate?: ScheduledPostCreateOrConnectWithoutPostInput | ScheduledPostCreateOrConnectWithoutPostInput[]
    upsert?: ScheduledPostUpsertWithWhereUniqueWithoutPostInput | ScheduledPostUpsertWithWhereUniqueWithoutPostInput[]
    createMany?: ScheduledPostCreateManyPostInputEnvelope
    set?: ScheduledPostWhereUniqueInput | ScheduledPostWhereUniqueInput[]
    disconnect?: ScheduledPostWhereUniqueInput | ScheduledPostWhereUniqueInput[]
    delete?: ScheduledPostWhereUniqueInput | ScheduledPostWhereUniqueInput[]
    connect?: ScheduledPostWhereUniqueInput | ScheduledPostWhereUniqueInput[]
    update?: ScheduledPostUpdateWithWhereUniqueWithoutPostInput | ScheduledPostUpdateWithWhereUniqueWithoutPostInput[]
    updateMany?: ScheduledPostUpdateManyWithWhereWithoutPostInput | ScheduledPostUpdateManyWithWhereWithoutPostInput[]
    deleteMany?: ScheduledPostScalarWhereInput | ScheduledPostScalarWhereInput[]
  }

  export type ScheduledPostUncheckedUpdateManyWithoutPostNestedInput = {
    create?: XOR<ScheduledPostCreateWithoutPostInput, ScheduledPostUncheckedCreateWithoutPostInput> | ScheduledPostCreateWithoutPostInput[] | ScheduledPostUncheckedCreateWithoutPostInput[]
    connectOrCreate?: ScheduledPostCreateOrConnectWithoutPostInput | ScheduledPostCreateOrConnectWithoutPostInput[]
    upsert?: ScheduledPostUpsertWithWhereUniqueWithoutPostInput | ScheduledPostUpsertWithWhereUniqueWithoutPostInput[]
    createMany?: ScheduledPostCreateManyPostInputEnvelope
    set?: ScheduledPostWhereUniqueInput | ScheduledPostWhereUniqueInput[]
    disconnect?: ScheduledPostWhereUniqueInput | ScheduledPostWhereUniqueInput[]
    delete?: ScheduledPostWhereUniqueInput | ScheduledPostWhereUniqueInput[]
    connect?: ScheduledPostWhereUniqueInput | ScheduledPostWhereUniqueInput[]
    update?: ScheduledPostUpdateWithWhereUniqueWithoutPostInput | ScheduledPostUpdateWithWhereUniqueWithoutPostInput[]
    updateMany?: ScheduledPostUpdateManyWithWhereWithoutPostInput | ScheduledPostUpdateManyWithWhereWithoutPostInput[]
    deleteMany?: ScheduledPostScalarWhereInput | ScheduledPostScalarWhereInput[]
  }

  export type PostCreateNestedOneWithoutScheduledPostsInput = {
    create?: XOR<PostCreateWithoutScheduledPostsInput, PostUncheckedCreateWithoutScheduledPostsInput>
    connectOrCreate?: PostCreateOrConnectWithoutScheduledPostsInput
    connect?: PostWhereUniqueInput
  }

  export type PostUpdateOneRequiredWithoutScheduledPostsNestedInput = {
    create?: XOR<PostCreateWithoutScheduledPostsInput, PostUncheckedCreateWithoutScheduledPostsInput>
    connectOrCreate?: PostCreateOrConnectWithoutScheduledPostsInput
    upsert?: PostUpsertWithoutScheduledPostsInput
    connect?: PostWhereUniqueInput
    update?: XOR<XOR<PostUpdateToOneWithWhereWithoutScheduledPostsInput, PostUpdateWithoutScheduledPostsInput>, PostUncheckedUpdateWithoutScheduledPostsInput>
  }

  export type NestedStringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[]
    notIn?: string[]
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type NestedStringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | null
    notIn?: string[] | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type NestedIntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type NestedIntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type NestedStringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[]
    notIn?: string[]
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedStringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | null
    notIn?: string[] | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type NestedIntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedIntNullableFilter<$PrismaModel>
    _max?: NestedIntNullableFilter<$PrismaModel>
  }

  export type NestedFloatNullableFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableFilter<$PrismaModel> | number | null
  }

  export type NestedIntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type NestedFloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type NestedDateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[]
    notIn?: Date[] | string[]
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type NestedFloatNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedFloatNullableFilter<$PrismaModel>
    _min?: NestedFloatNullableFilter<$PrismaModel>
    _max?: NestedFloatNullableFilter<$PrismaModel>
  }

  export type NestedDateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[]
    notIn?: Date[] | string[]
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type InsightCreateWithoutTranscriptInput = {
    id?: string
    title: string
    summary: string
    verbatimQuote: string
    category: string
    postType: string
    urgencyScore: number
    relatabilityScore: number
    specificityScore: number
    authorityScore: number
    totalScore: number
    status?: string
    processingDurationMs?: number | null
    estimatedTokens?: number | null
    estimatedCost?: number | null
    createdAt?: Date | string
    updatedAt?: Date | string
    posts?: PostCreateNestedManyWithoutInsightInput
  }

  export type InsightUncheckedCreateWithoutTranscriptInput = {
    id?: string
    title: string
    summary: string
    verbatimQuote: string
    category: string
    postType: string
    urgencyScore: number
    relatabilityScore: number
    specificityScore: number
    authorityScore: number
    totalScore: number
    status?: string
    processingDurationMs?: number | null
    estimatedTokens?: number | null
    estimatedCost?: number | null
    createdAt?: Date | string
    updatedAt?: Date | string
    posts?: PostUncheckedCreateNestedManyWithoutInsightInput
  }

  export type InsightCreateOrConnectWithoutTranscriptInput = {
    where: InsightWhereUniqueInput
    create: XOR<InsightCreateWithoutTranscriptInput, InsightUncheckedCreateWithoutTranscriptInput>
  }

  export type InsightCreateManyTranscriptInputEnvelope = {
    data: InsightCreateManyTranscriptInput | InsightCreateManyTranscriptInput[]
  }

  export type InsightUpsertWithWhereUniqueWithoutTranscriptInput = {
    where: InsightWhereUniqueInput
    update: XOR<InsightUpdateWithoutTranscriptInput, InsightUncheckedUpdateWithoutTranscriptInput>
    create: XOR<InsightCreateWithoutTranscriptInput, InsightUncheckedCreateWithoutTranscriptInput>
  }

  export type InsightUpdateWithWhereUniqueWithoutTranscriptInput = {
    where: InsightWhereUniqueInput
    data: XOR<InsightUpdateWithoutTranscriptInput, InsightUncheckedUpdateWithoutTranscriptInput>
  }

  export type InsightUpdateManyWithWhereWithoutTranscriptInput = {
    where: InsightScalarWhereInput
    data: XOR<InsightUpdateManyMutationInput, InsightUncheckedUpdateManyWithoutTranscriptInput>
  }

  export type InsightScalarWhereInput = {
    AND?: InsightScalarWhereInput | InsightScalarWhereInput[]
    OR?: InsightScalarWhereInput[]
    NOT?: InsightScalarWhereInput | InsightScalarWhereInput[]
    id?: StringFilter<"Insight"> | string
    cleanedTranscriptId?: StringFilter<"Insight"> | string
    title?: StringFilter<"Insight"> | string
    summary?: StringFilter<"Insight"> | string
    verbatimQuote?: StringFilter<"Insight"> | string
    category?: StringFilter<"Insight"> | string
    postType?: StringFilter<"Insight"> | string
    urgencyScore?: IntFilter<"Insight"> | number
    relatabilityScore?: IntFilter<"Insight"> | number
    specificityScore?: IntFilter<"Insight"> | number
    authorityScore?: IntFilter<"Insight"> | number
    totalScore?: IntFilter<"Insight"> | number
    status?: StringFilter<"Insight"> | string
    processingDurationMs?: IntNullableFilter<"Insight"> | number | null
    estimatedTokens?: IntNullableFilter<"Insight"> | number | null
    estimatedCost?: FloatNullableFilter<"Insight"> | number | null
    createdAt?: DateTimeFilter<"Insight"> | Date | string
    updatedAt?: DateTimeFilter<"Insight"> | Date | string
  }

  export type TranscriptCreateWithoutInsightsInput = {
    id?: string
    title: string
    rawContent: string
    cleanedContent?: string | null
    status?: string
    sourceType?: string | null
    sourceUrl?: string | null
    fileName?: string | null
    duration?: number | null
    wordCount?: number
    filePath?: string | null
    createdAt?: string
    updatedAt?: string
  }

  export type TranscriptUncheckedCreateWithoutInsightsInput = {
    id?: string
    title: string
    rawContent: string
    cleanedContent?: string | null
    status?: string
    sourceType?: string | null
    sourceUrl?: string | null
    fileName?: string | null
    duration?: number | null
    wordCount?: number
    filePath?: string | null
    createdAt?: string
    updatedAt?: string
  }

  export type TranscriptCreateOrConnectWithoutInsightsInput = {
    where: TranscriptWhereUniqueInput
    create: XOR<TranscriptCreateWithoutInsightsInput, TranscriptUncheckedCreateWithoutInsightsInput>
  }

  export type PostCreateWithoutInsightInput = {
    id?: string
    title: string
    platform: string
    content: string
    status?: string
    characterCount?: number | null
    createdAt?: string
    updatedAt?: string
    scheduledPosts?: ScheduledPostCreateNestedManyWithoutPostInput
  }

  export type PostUncheckedCreateWithoutInsightInput = {
    id?: string
    title: string
    platform: string
    content: string
    status?: string
    characterCount?: number | null
    createdAt?: string
    updatedAt?: string
    scheduledPosts?: ScheduledPostUncheckedCreateNestedManyWithoutPostInput
  }

  export type PostCreateOrConnectWithoutInsightInput = {
    where: PostWhereUniqueInput
    create: XOR<PostCreateWithoutInsightInput, PostUncheckedCreateWithoutInsightInput>
  }

  export type PostCreateManyInsightInputEnvelope = {
    data: PostCreateManyInsightInput | PostCreateManyInsightInput[]
  }

  export type TranscriptUpsertWithoutInsightsInput = {
    update: XOR<TranscriptUpdateWithoutInsightsInput, TranscriptUncheckedUpdateWithoutInsightsInput>
    create: XOR<TranscriptCreateWithoutInsightsInput, TranscriptUncheckedCreateWithoutInsightsInput>
    where?: TranscriptWhereInput
  }

  export type TranscriptUpdateToOneWithWhereWithoutInsightsInput = {
    where?: TranscriptWhereInput
    data: XOR<TranscriptUpdateWithoutInsightsInput, TranscriptUncheckedUpdateWithoutInsightsInput>
  }

  export type TranscriptUpdateWithoutInsightsInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    rawContent?: StringFieldUpdateOperationsInput | string
    cleanedContent?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    sourceType?: NullableStringFieldUpdateOperationsInput | string | null
    sourceUrl?: NullableStringFieldUpdateOperationsInput | string | null
    fileName?: NullableStringFieldUpdateOperationsInput | string | null
    duration?: NullableIntFieldUpdateOperationsInput | number | null
    wordCount?: IntFieldUpdateOperationsInput | number
    filePath?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: StringFieldUpdateOperationsInput | string
    updatedAt?: StringFieldUpdateOperationsInput | string
  }

  export type TranscriptUncheckedUpdateWithoutInsightsInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    rawContent?: StringFieldUpdateOperationsInput | string
    cleanedContent?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    sourceType?: NullableStringFieldUpdateOperationsInput | string | null
    sourceUrl?: NullableStringFieldUpdateOperationsInput | string | null
    fileName?: NullableStringFieldUpdateOperationsInput | string | null
    duration?: NullableIntFieldUpdateOperationsInput | number | null
    wordCount?: IntFieldUpdateOperationsInput | number
    filePath?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: StringFieldUpdateOperationsInput | string
    updatedAt?: StringFieldUpdateOperationsInput | string
  }

  export type PostUpsertWithWhereUniqueWithoutInsightInput = {
    where: PostWhereUniqueInput
    update: XOR<PostUpdateWithoutInsightInput, PostUncheckedUpdateWithoutInsightInput>
    create: XOR<PostCreateWithoutInsightInput, PostUncheckedCreateWithoutInsightInput>
  }

  export type PostUpdateWithWhereUniqueWithoutInsightInput = {
    where: PostWhereUniqueInput
    data: XOR<PostUpdateWithoutInsightInput, PostUncheckedUpdateWithoutInsightInput>
  }

  export type PostUpdateManyWithWhereWithoutInsightInput = {
    where: PostScalarWhereInput
    data: XOR<PostUpdateManyMutationInput, PostUncheckedUpdateManyWithoutInsightInput>
  }

  export type PostScalarWhereInput = {
    AND?: PostScalarWhereInput | PostScalarWhereInput[]
    OR?: PostScalarWhereInput[]
    NOT?: PostScalarWhereInput | PostScalarWhereInput[]
    id?: StringFilter<"Post"> | string
    insightId?: StringFilter<"Post"> | string
    title?: StringFilter<"Post"> | string
    platform?: StringFilter<"Post"> | string
    content?: StringFilter<"Post"> | string
    status?: StringFilter<"Post"> | string
    characterCount?: IntNullableFilter<"Post"> | number | null
    createdAt?: StringFilter<"Post"> | string
    updatedAt?: StringFilter<"Post"> | string
  }

  export type InsightCreateWithoutPostsInput = {
    id?: string
    title: string
    summary: string
    verbatimQuote: string
    category: string
    postType: string
    urgencyScore: number
    relatabilityScore: number
    specificityScore: number
    authorityScore: number
    totalScore: number
    status?: string
    processingDurationMs?: number | null
    estimatedTokens?: number | null
    estimatedCost?: number | null
    createdAt?: Date | string
    updatedAt?: Date | string
    transcript: TranscriptCreateNestedOneWithoutInsightsInput
  }

  export type InsightUncheckedCreateWithoutPostsInput = {
    id?: string
    cleanedTranscriptId: string
    title: string
    summary: string
    verbatimQuote: string
    category: string
    postType: string
    urgencyScore: number
    relatabilityScore: number
    specificityScore: number
    authorityScore: number
    totalScore: number
    status?: string
    processingDurationMs?: number | null
    estimatedTokens?: number | null
    estimatedCost?: number | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type InsightCreateOrConnectWithoutPostsInput = {
    where: InsightWhereUniqueInput
    create: XOR<InsightCreateWithoutPostsInput, InsightUncheckedCreateWithoutPostsInput>
  }

  export type ScheduledPostCreateWithoutPostInput = {
    id?: string
    platform: string
    content: string
    scheduledTime: string
    status?: string
    retryCount?: number
    lastAttempt?: string | null
    errorMessage?: string | null
    externalPostId?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ScheduledPostUncheckedCreateWithoutPostInput = {
    id?: string
    platform: string
    content: string
    scheduledTime: string
    status?: string
    retryCount?: number
    lastAttempt?: string | null
    errorMessage?: string | null
    externalPostId?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ScheduledPostCreateOrConnectWithoutPostInput = {
    where: ScheduledPostWhereUniqueInput
    create: XOR<ScheduledPostCreateWithoutPostInput, ScheduledPostUncheckedCreateWithoutPostInput>
  }

  export type ScheduledPostCreateManyPostInputEnvelope = {
    data: ScheduledPostCreateManyPostInput | ScheduledPostCreateManyPostInput[]
  }

  export type InsightUpsertWithoutPostsInput = {
    update: XOR<InsightUpdateWithoutPostsInput, InsightUncheckedUpdateWithoutPostsInput>
    create: XOR<InsightCreateWithoutPostsInput, InsightUncheckedCreateWithoutPostsInput>
    where?: InsightWhereInput
  }

  export type InsightUpdateToOneWithWhereWithoutPostsInput = {
    where?: InsightWhereInput
    data: XOR<InsightUpdateWithoutPostsInput, InsightUncheckedUpdateWithoutPostsInput>
  }

  export type InsightUpdateWithoutPostsInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    summary?: StringFieldUpdateOperationsInput | string
    verbatimQuote?: StringFieldUpdateOperationsInput | string
    category?: StringFieldUpdateOperationsInput | string
    postType?: StringFieldUpdateOperationsInput | string
    urgencyScore?: IntFieldUpdateOperationsInput | number
    relatabilityScore?: IntFieldUpdateOperationsInput | number
    specificityScore?: IntFieldUpdateOperationsInput | number
    authorityScore?: IntFieldUpdateOperationsInput | number
    totalScore?: IntFieldUpdateOperationsInput | number
    status?: StringFieldUpdateOperationsInput | string
    processingDurationMs?: NullableIntFieldUpdateOperationsInput | number | null
    estimatedTokens?: NullableIntFieldUpdateOperationsInput | number | null
    estimatedCost?: NullableFloatFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    transcript?: TranscriptUpdateOneRequiredWithoutInsightsNestedInput
  }

  export type InsightUncheckedUpdateWithoutPostsInput = {
    id?: StringFieldUpdateOperationsInput | string
    cleanedTranscriptId?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    summary?: StringFieldUpdateOperationsInput | string
    verbatimQuote?: StringFieldUpdateOperationsInput | string
    category?: StringFieldUpdateOperationsInput | string
    postType?: StringFieldUpdateOperationsInput | string
    urgencyScore?: IntFieldUpdateOperationsInput | number
    relatabilityScore?: IntFieldUpdateOperationsInput | number
    specificityScore?: IntFieldUpdateOperationsInput | number
    authorityScore?: IntFieldUpdateOperationsInput | number
    totalScore?: IntFieldUpdateOperationsInput | number
    status?: StringFieldUpdateOperationsInput | string
    processingDurationMs?: NullableIntFieldUpdateOperationsInput | number | null
    estimatedTokens?: NullableIntFieldUpdateOperationsInput | number | null
    estimatedCost?: NullableFloatFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ScheduledPostUpsertWithWhereUniqueWithoutPostInput = {
    where: ScheduledPostWhereUniqueInput
    update: XOR<ScheduledPostUpdateWithoutPostInput, ScheduledPostUncheckedUpdateWithoutPostInput>
    create: XOR<ScheduledPostCreateWithoutPostInput, ScheduledPostUncheckedCreateWithoutPostInput>
  }

  export type ScheduledPostUpdateWithWhereUniqueWithoutPostInput = {
    where: ScheduledPostWhereUniqueInput
    data: XOR<ScheduledPostUpdateWithoutPostInput, ScheduledPostUncheckedUpdateWithoutPostInput>
  }

  export type ScheduledPostUpdateManyWithWhereWithoutPostInput = {
    where: ScheduledPostScalarWhereInput
    data: XOR<ScheduledPostUpdateManyMutationInput, ScheduledPostUncheckedUpdateManyWithoutPostInput>
  }

  export type ScheduledPostScalarWhereInput = {
    AND?: ScheduledPostScalarWhereInput | ScheduledPostScalarWhereInput[]
    OR?: ScheduledPostScalarWhereInput[]
    NOT?: ScheduledPostScalarWhereInput | ScheduledPostScalarWhereInput[]
    id?: StringFilter<"ScheduledPost"> | string
    postId?: StringFilter<"ScheduledPost"> | string
    platform?: StringFilter<"ScheduledPost"> | string
    content?: StringFilter<"ScheduledPost"> | string
    scheduledTime?: StringFilter<"ScheduledPost"> | string
    status?: StringFilter<"ScheduledPost"> | string
    retryCount?: IntFilter<"ScheduledPost"> | number
    lastAttempt?: StringNullableFilter<"ScheduledPost"> | string | null
    errorMessage?: StringNullableFilter<"ScheduledPost"> | string | null
    externalPostId?: StringNullableFilter<"ScheduledPost"> | string | null
    createdAt?: DateTimeFilter<"ScheduledPost"> | Date | string
    updatedAt?: DateTimeFilter<"ScheduledPost"> | Date | string
  }

  export type PostCreateWithoutScheduledPostsInput = {
    id?: string
    title: string
    platform: string
    content: string
    status?: string
    characterCount?: number | null
    createdAt?: string
    updatedAt?: string
    insight: InsightCreateNestedOneWithoutPostsInput
  }

  export type PostUncheckedCreateWithoutScheduledPostsInput = {
    id?: string
    insightId: string
    title: string
    platform: string
    content: string
    status?: string
    characterCount?: number | null
    createdAt?: string
    updatedAt?: string
  }

  export type PostCreateOrConnectWithoutScheduledPostsInput = {
    where: PostWhereUniqueInput
    create: XOR<PostCreateWithoutScheduledPostsInput, PostUncheckedCreateWithoutScheduledPostsInput>
  }

  export type PostUpsertWithoutScheduledPostsInput = {
    update: XOR<PostUpdateWithoutScheduledPostsInput, PostUncheckedUpdateWithoutScheduledPostsInput>
    create: XOR<PostCreateWithoutScheduledPostsInput, PostUncheckedCreateWithoutScheduledPostsInput>
    where?: PostWhereInput
  }

  export type PostUpdateToOneWithWhereWithoutScheduledPostsInput = {
    where?: PostWhereInput
    data: XOR<PostUpdateWithoutScheduledPostsInput, PostUncheckedUpdateWithoutScheduledPostsInput>
  }

  export type PostUpdateWithoutScheduledPostsInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    platform?: StringFieldUpdateOperationsInput | string
    content?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    characterCount?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: StringFieldUpdateOperationsInput | string
    updatedAt?: StringFieldUpdateOperationsInput | string
    insight?: InsightUpdateOneRequiredWithoutPostsNestedInput
  }

  export type PostUncheckedUpdateWithoutScheduledPostsInput = {
    id?: StringFieldUpdateOperationsInput | string
    insightId?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    platform?: StringFieldUpdateOperationsInput | string
    content?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    characterCount?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: StringFieldUpdateOperationsInput | string
    updatedAt?: StringFieldUpdateOperationsInput | string
  }

  export type InsightCreateManyTranscriptInput = {
    id?: string
    title: string
    summary: string
    verbatimQuote: string
    category: string
    postType: string
    urgencyScore: number
    relatabilityScore: number
    specificityScore: number
    authorityScore: number
    totalScore: number
    status?: string
    processingDurationMs?: number | null
    estimatedTokens?: number | null
    estimatedCost?: number | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type InsightUpdateWithoutTranscriptInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    summary?: StringFieldUpdateOperationsInput | string
    verbatimQuote?: StringFieldUpdateOperationsInput | string
    category?: StringFieldUpdateOperationsInput | string
    postType?: StringFieldUpdateOperationsInput | string
    urgencyScore?: IntFieldUpdateOperationsInput | number
    relatabilityScore?: IntFieldUpdateOperationsInput | number
    specificityScore?: IntFieldUpdateOperationsInput | number
    authorityScore?: IntFieldUpdateOperationsInput | number
    totalScore?: IntFieldUpdateOperationsInput | number
    status?: StringFieldUpdateOperationsInput | string
    processingDurationMs?: NullableIntFieldUpdateOperationsInput | number | null
    estimatedTokens?: NullableIntFieldUpdateOperationsInput | number | null
    estimatedCost?: NullableFloatFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    posts?: PostUpdateManyWithoutInsightNestedInput
  }

  export type InsightUncheckedUpdateWithoutTranscriptInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    summary?: StringFieldUpdateOperationsInput | string
    verbatimQuote?: StringFieldUpdateOperationsInput | string
    category?: StringFieldUpdateOperationsInput | string
    postType?: StringFieldUpdateOperationsInput | string
    urgencyScore?: IntFieldUpdateOperationsInput | number
    relatabilityScore?: IntFieldUpdateOperationsInput | number
    specificityScore?: IntFieldUpdateOperationsInput | number
    authorityScore?: IntFieldUpdateOperationsInput | number
    totalScore?: IntFieldUpdateOperationsInput | number
    status?: StringFieldUpdateOperationsInput | string
    processingDurationMs?: NullableIntFieldUpdateOperationsInput | number | null
    estimatedTokens?: NullableIntFieldUpdateOperationsInput | number | null
    estimatedCost?: NullableFloatFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    posts?: PostUncheckedUpdateManyWithoutInsightNestedInput
  }

  export type InsightUncheckedUpdateManyWithoutTranscriptInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    summary?: StringFieldUpdateOperationsInput | string
    verbatimQuote?: StringFieldUpdateOperationsInput | string
    category?: StringFieldUpdateOperationsInput | string
    postType?: StringFieldUpdateOperationsInput | string
    urgencyScore?: IntFieldUpdateOperationsInput | number
    relatabilityScore?: IntFieldUpdateOperationsInput | number
    specificityScore?: IntFieldUpdateOperationsInput | number
    authorityScore?: IntFieldUpdateOperationsInput | number
    totalScore?: IntFieldUpdateOperationsInput | number
    status?: StringFieldUpdateOperationsInput | string
    processingDurationMs?: NullableIntFieldUpdateOperationsInput | number | null
    estimatedTokens?: NullableIntFieldUpdateOperationsInput | number | null
    estimatedCost?: NullableFloatFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PostCreateManyInsightInput = {
    id?: string
    title: string
    platform: string
    content: string
    status?: string
    characterCount?: number | null
    createdAt?: string
    updatedAt?: string
  }

  export type PostUpdateWithoutInsightInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    platform?: StringFieldUpdateOperationsInput | string
    content?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    characterCount?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: StringFieldUpdateOperationsInput | string
    updatedAt?: StringFieldUpdateOperationsInput | string
    scheduledPosts?: ScheduledPostUpdateManyWithoutPostNestedInput
  }

  export type PostUncheckedUpdateWithoutInsightInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    platform?: StringFieldUpdateOperationsInput | string
    content?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    characterCount?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: StringFieldUpdateOperationsInput | string
    updatedAt?: StringFieldUpdateOperationsInput | string
    scheduledPosts?: ScheduledPostUncheckedUpdateManyWithoutPostNestedInput
  }

  export type PostUncheckedUpdateManyWithoutInsightInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    platform?: StringFieldUpdateOperationsInput | string
    content?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    characterCount?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: StringFieldUpdateOperationsInput | string
    updatedAt?: StringFieldUpdateOperationsInput | string
  }

  export type ScheduledPostCreateManyPostInput = {
    id?: string
    platform: string
    content: string
    scheduledTime: string
    status?: string
    retryCount?: number
    lastAttempt?: string | null
    errorMessage?: string | null
    externalPostId?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ScheduledPostUpdateWithoutPostInput = {
    id?: StringFieldUpdateOperationsInput | string
    platform?: StringFieldUpdateOperationsInput | string
    content?: StringFieldUpdateOperationsInput | string
    scheduledTime?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    retryCount?: IntFieldUpdateOperationsInput | number
    lastAttempt?: NullableStringFieldUpdateOperationsInput | string | null
    errorMessage?: NullableStringFieldUpdateOperationsInput | string | null
    externalPostId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ScheduledPostUncheckedUpdateWithoutPostInput = {
    id?: StringFieldUpdateOperationsInput | string
    platform?: StringFieldUpdateOperationsInput | string
    content?: StringFieldUpdateOperationsInput | string
    scheduledTime?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    retryCount?: IntFieldUpdateOperationsInput | number
    lastAttempt?: NullableStringFieldUpdateOperationsInput | string | null
    errorMessage?: NullableStringFieldUpdateOperationsInput | string | null
    externalPostId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ScheduledPostUncheckedUpdateManyWithoutPostInput = {
    id?: StringFieldUpdateOperationsInput | string
    platform?: StringFieldUpdateOperationsInput | string
    content?: StringFieldUpdateOperationsInput | string
    scheduledTime?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    retryCount?: IntFieldUpdateOperationsInput | number
    lastAttempt?: NullableStringFieldUpdateOperationsInput | string | null
    errorMessage?: NullableStringFieldUpdateOperationsInput | string | null
    externalPostId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }



  /**
   * Batch Payload for updateMany & deleteMany & createMany
   */

  export type BatchPayload = {
    count: number
  }

  /**
   * DMMF
   */
  export const dmmf: runtime.BaseDMMF
}