# APIM Policy Expressions Reference

Source: https://learn.microsoft.com/en-us/azure/api-management/api-management-policy-expressions

## Syntax
- Single statement: `@(expression)` — valid C# 7 expression
- Multi-statement: `@{statements}` — all code paths must end with `return`

## Allowed .NET Types
Newtonsoft.Json.Formatting, Newtonsoft.Json.JsonConvert, Newtonsoft.Json.Linq.Extensions,
Newtonsoft.Json.Linq.JArray, Newtonsoft.Json.Linq.JConstructor, Newtonsoft.Json.Linq.JContainer,
Newtonsoft.Json.Linq.JObject, Newtonsoft.Json.Linq.JProperty, Newtonsoft.Json.Linq.JRaw,
Newtonsoft.Json.Linq.JToken, Newtonsoft.Json.Linq.JTokenType, Newtonsoft.Json.Linq.JValue,
System.Array, System.BitConverter, System.Boolean, System.Byte, System.Char,
System.Collections.Generic.Dictionary, System.Collections.Generic.HashSet,
System.Collections.Generic.ICollection, System.Collections.Generic.IDictionary,
System.Collections.Generic.IEnumerable, System.Collections.Generic.IEnumerator,
System.Collections.Generic.IList, System.Collections.Generic.IReadOnlyCollection,
System.Collections.Generic.IReadOnlyDictionary, System.Collections.Generic.ISet,
System.Collections.Generic.KeyValuePair, System.Collections.Generic.List,
System.Collections.Generic.Queue, System.Collections.Generic.Stack,
System.Convert, System.DateTime, System.DateTimeKind, System.DateTimeOffset,
System.Decimal, System.Double, System.Enum, System.Exception, System.Guid,
System.Int16, System.Int32, System.Int64, System.IO.StringReader, System.IO.StringWriter,
System.Linq.Enumerable, System.Math, System.MidpointRounding,
System.Net.IPAddress, System.Net.WebUtility, System.Nullable, System.Random,
System.SByte, System.Security.Cryptography.*, System.Single, System.String,
System.StringComparer, System.StringComparison, System.StringSplitOptions,
System.Text.Encoding, System.Text.RegularExpressions.*, System.Text.StringBuilder,
System.TimeSpan, System.TimeZone, System.TimeZoneInfo, System.Tuple,
System.UInt16, System.UInt32, System.UInt64, System.Uri, System.UriPartial,
System.Xml.Linq.*

## Context Variable API
- context.Api: Id, IsCurrentRevision, Name, Path, Revision, ServiceUrl, Version
- context.Backend: AzureRegion, Id, Type
- context.Deployment: Gateway, GatewayId, Region, ServiceId, ServiceName, SustainabilityInfo, Certificates
- context.GraphQL: GraphQLArguments, Parent
- context.LastError: Source, Reason, Message, Scope, Section, Path, PolicyId
- context.Operation: Id, Method, Name, UrlTemplate
- context.Product: ApprovalRequired, Groups, Id, Name, State, SubscriptionsLimit, SubscriptionRequired
- context.Request: Body, Certificate, Foundry, Headers, IpAddress, MatchedParameters, Method, OriginalUrl, Url, PrivateEndpointConnection
- context.Request.Foundry: Deployment
- context.Request.Headers.GetValueOrDefault(headerName, defaultValue)
- context.Response: Body, Headers, StatusCode, StatusReason
- context.Subscription: CreatedDate, EndDate, Id, Key, Name, PrimaryKey, SecondaryKey, StartDate
- context.User: Email, FirstName, Groups, Id, Identities, LastName, Note, RegistrationDate
- context.Workspace: Id, Name
- context.Variables.GetValueOrDefault<T>(variableName, defaultValue)
- context.Variables.ContainsKey(variableName)
- context.RequestId: Guid
- context.Timestamp: DateTime
- context.Tracing: bool
- context.Elapsed: TimeSpan
- context.Trace(message)

## IMessageBody
- As<T>(preserveContent: bool) where T: string, byte[], JObject, JToken, JArray, XNode, XElement, XDocument
- AsFormUrlEncodedContent(preserveContent: bool)

## IUrl
- Host, Path, Port, Query, QueryString, Scheme

## Jwt
- Algorithm, Audiences, Claims, ExpirationTime, Id, Issuer, IssuedAt, NotBefore, Subject, Type
- Claims.GetValueOrDefault(claimName, defaultValue)

## Helper Methods
- AsBasic(input), TryParseBasic(input, result)
- AsJwt(input), TryParseJwt(input, result)
- Encrypt/Decrypt methods
- VerifyNoRevocation(cert)
