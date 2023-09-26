---
daoip: 3
title: Attestations for DAOs
description: An attestation-based architecture and data model for DAO membership, member contributions, and other data.
discussions-to: https://github.com/metagov/daostar/discussions/39
status: Draft
type: 
category: 
author: Fernando Mendes <mmendes@avenue.place>, Joshua Tan <josh@metagov.org>, 
created: 2023-02-03
---

## Abstract

This standard provides the basic architecture for a permissionless attestation framework where different parties can make arbitrary and conflicting attestations about DAO membership, member contributions, and other data.

*Note: this standard does* not *specify how DAOs and service providers should handle identity verification & management. We assume that many different identity systems exist in tandem across different DAOs and different service providers. The way these are implemented is left to the discretion of both the DAO and its service providers. Thus, this standard is NOT appropriate for handling personally-identifiable information (PII) or other forms of personal data.*

## Motivation

What does it mean to contribute to a DAO, and where can people find these contributions? What does it mean to be a member of a DAO, and how can membership be verified?

Contributions and membership are important building blocks within DAOs and related Web3 applications, from Web3 profiles to contribution graphs to measures of participation to interoperable reputation metrics. These systems are often the first settings in which DAOs and DAO service providers need to operationalize their underlying identity systems.

In current DAOs, membership and contributions are commonly defined via ownership of on-chain assets, whether fungible tokens, NFTs, or (more recently) soulbound NFTs. But on-chain definitions miss many important use-cases and risk locking DAOs into very specific modes of membership and organization. For example, a DAO may want to make membership contingent on some (off-chain) measure of participation such as git commits or Discourse posts, while definitions of contributions could vary across each of the (off- and on-chain) services that a DAO uses to track contributions.

[daoURI](https://daostar.one/EIP) already allows DAOs to publish off-chain data about their membership. This standard composes with daoURI in order to specify a permissionless attestation framework for DAOs and DAO service providers.

## Specification

The key words “MUST”, “MUST NOT”, “REQUIRED”, “SHALL”, “SHALL NOT”, “SHOULD”, “SHOULD NOT”, “RECOMMENDED”, “MAY”, and “OPTIONAL” in this document are to be interpreted as described in RFC 2119.

### For DAOs: attestationIssuers and issuerURI

All DAOs conforming to DAOIP-3 MUST implement the `attestationIssuersURI` field as part of `daoURI`. 

```json
{
	"@context": "<http://www.daostar.org/schemas>",
	"type": "DAO",
	"attestationIssuersURI": "<URI>"
}
```

`attestationIssuersURI` MUST then return an array of attestation endpoints following the Attestation Issuers JSON-LD Schema below. The various issuerURIs MAY then be crawled and indexed by explorers and other services. Each issuerURI SHOULD be hosted by a service provider trusted by the DAO to issue relevant attestations on its behalf and/or on behalf of its members.

The Attestation Issuers JSON-LD Schema
```json
{
	"@context": "<http://www.daostar.org/schemas>",
	"type": "attestationIssuers",
	"name": "Name of the DAO",
	"attestationIssuers": [
		{
			"type": "AttestationIssuer",
			"issuerURI": "<URI>"
		},
		{
			"type": "AttestationIssuer",
			"issuerURI": "<URI>"
		}
	]
}
```

### For Issuers: Attestation Endpoints

An *attestation issuer*, or just issuer, is an entity that issues and manages attestations on behalf of some other entity such as a DAO. 

Every issuer conforming to DAOIP-3 MUST implement an `issuerURI` endpoint describing the issuer and listing endpoints that it supports, following the Attestation Issuer JSON Schema below: 

```json
{
	"@context": "http://www.daostar.org/schemas",
	"type": "issuer",
	"name": "<name of the issuer>",
	"description": "<description>",
	"memberAttestationsURI": "<URI>"
}
```

Further, each issuer MUST implement a `memberAttestationsURI` attestation endpoint which, given a member object as recorded in the [daostar.org/schemas](http://daostar.org/schemas) context files, returns a list of organizations following the memberAttestationsURI JSON Schema below:

```json
{
	"@context": "http://www.daostar.org/schemas",
	"type": "arrayAttestation",
	"issuerURI": "<issuer's issuerURI>",
	"member": {
		"type": "<e.g. EthereumAddress, DID, ENS, CAIP10Address",
		"id": "<identifier or address corresponding to the identity type above>"
	},
	"organizations": [
		{
			"type": "membershipAttestation",
			"expiration": "ISO-datetime",
			"attestationURI": "<the URI from which someone can obtain the attestation, in this case, the DAO's own membersURI OR the issuer's getMemberAttestationsURI>",
			"name": "<name of the DAO>",
			"daoURI": "<the DAO's daoURI, following EIP-4824>"
		}
	],
	"contributions": [
		{
			"type": "contributionAttestation",
			"expiration": "ISO-datetime",
			"attestationURI": "<the URI from which someone can obtain the attestation, in this case, the issuer's getMemberAttestationsURI>",
			"contributionType": "<arbitrary text, e.g. tweet>",
			"contributionURI": "<arbitrary URI giving information about the contribution>"
		}
	]
}
```

In particular, note the inclusion of an expiration field on every attestation.

Further, note that the above schema is designed to attest to a member object by looking up its “identity”, where identity might be determined by Ethereum address, Cosmos address, CAIP-10 address, decentralized identity, ENS, BrightID, Disco, or any other service with a recognized identity type.

#### Extensions

Issuers that wish to extend the attestation framework above to attestations about things other than membership or contribution can use the following schema for their attestations:

```json
{
	"@context": "http://www.daostar.org/schemas",
	"type": "attestation",
	"expiration": "ISO-datetime",
	"attestationURI": "<the URI from which someone can obtain the attestation>"
}
```

## Rationale

This attestation framework is designed to support multi-party integrations between DAOs and DAO service providers, including use-cases related to Web3 profiles and Web3 CVs that *do not* assume any identity system or verification system such as [verifiable credentials](https://www.w3.org/TR/vc-data-model/) or [soulbound tokens](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4105763).

### Example

Let’s take a hypothetical example featuring two DAOs (DAOstar One and groundw3rk) and three attestation issuers (Disco, Govrn, and Avenue). Assume a user owns two different addresses: `josh.eth` and `joshua.eth`.

Through their two addresses, the user belongs to two DAOs:

1. `josh.eth` owns enough DAO tokens to be a member of DAOstar One
2. `joshua.eth` owns an NFT needed to be a member of groundw3rk

Our user logs into Avenue using `josh.eth`. When a third-party queries Avenue’s attestation endpoint, the response should be:

```json
{
	"@context": "http://www.daostar.org/schemas",
	"type": "arrayAttestation",
	"issuer": "<Avenue's issuerURI>",
	"member": {
		"type": "ENS",
		"id": "josh.eth"
	},
	"organizations": [
		{
			"expiration": "<ISO-datetime>",
			"attesterURI": "<DAOStar One's membersURI>",
			"name": "DAOstar One",
			"daoURI": "<DAOStar One's daoURI, following EIP-4824>"
		}
	]
}
```

Let’s now assume DAOStar One is using Govrn to track contributions and Avenue is integrating with Govrn to track data.

Any contributions the user allows to be publicly shared will also be available to Avenue. Even though a client would be querying Avenue’s attestation endpoint, the `contributions` field would relay any contributions made by Govrn. Querying the previous endpoint would return:

```json
{
	"@context": "http://www.daostar.org/schemas",
	"type": "arrayAttestation",
	"issuer": "<Avenue's issuerURI>",
	"member": {
		"type": "ENS",
		"id": "josh.eth"
	},
	"organizations": [
		{
			"expiration": "<ISO-datetime>",
			"attesterURI": "<DAOStar One's membersURI>",
			"name": "DAOstar One",
			"daoURI": "<DAOStar One's daoURI, following EIP-4824>"
		}
	],
	"contributions": [
		{
			"type": "contribution",
			"commit_type": "tweet",
			"reference?": "<URI reference to the tweet on Govrn's platform>",
			"attesterURI": "<Govrn's issuerURI>"
		}
	]
}
```

Notice the `contributions` field includes information issued by Govrn and relayed by Avenue. Making use of this information relay allows tools to easily integrate with a single one of the issuers but still have access to data of others without being aware of any implementation details. At the same time, there’s still confidence in the data being relayed since it can be validated by the `reference` field.

Let’s assume now that Avenue also integrates with Disco. Disco, in turn, attests user identities. If the user links both profiles (`josh.eth` and `joshua.eth`) in Disco, even though the former only has token access to DAOStar One, Disco can issue an attestation that it should be able to access groundw3rk as well. In essence, Disco is stating “`josh.eth` has tokens to access DAOStar One but, even though you can’t see it, I guarantee you its owner also has an address with the NFT to access groundw3rk”.

This is represented by returning the following data in Discos’ issuer endpoint:  

```json
{
	"@context": "http://www.daostar.org/schemas",
	"type": "arrayAttestation",
	"issuer": "<Disco's issuerURI>",
	"member": {
		"type": "ENS",
		"id": "josh.eth"
	},
	"organizations": [
		{
			"expiration": "<ISO-datetime>",
			"attesterURI": "<DAOStar One's membersURI>",
			"name": "DAOstar One",
			"daoURI": "<DAOStar One's daoURI, following EIP-4824>"
		},
		{
			"expiration": "<ISO-datetime>",
			"attesterURI": "<Disco's URI>",
			"name": "groundw3rk",
			"daoURI": "<groundw3rk's daoURI, following EIP-4824>"
		}
	]
}
```

Notice how the `attesterURI` in this scenario points to Disco’s own URI. A third-party using this information to token gate access to a DAO should decide if they trust Disco’s attestation.

### For DAOs: attestationIssuers and issuerURI

The basic use-case for a DAO using `attestationIssuers` and `issuerURI` is so that the DAO can (1) declare what services they use, along with the data published by those service providers, and (2) to declare to other services where “authorized” third party data is being maintained about members of the data.

Attestations issued by an issuer listed in `attestationIssuers` should be considered acceptable evidence of membership in the DAO.

### Expiration

Since attestations can be easily (and freely) issued by the DAO issuer contract or a trusted party, we propose adding an expiry timestamp to the attestation schema. Having a (short-lived) self-expiring attestation avoids the rigmarole of maintaining a revocation registry and the underlying issues of trust and access to it.

With self-revoking credentials, the problem of storing is partially solved: they can at any time be reissued by the DAO contract or the trusted party. The approach also adds flexibility for storage by the user themselves (e.g. via a browser extension, that could potentially automatically refresh expired credentials).

## Acknowledgements

We would like to thank Aaron Soskin, Balazs Nemethi, Conner Swenberg, Cent Hosten, Ese Mentie, Pion Medvedeva, and Bryan Petes for their helpful comments and suggestions in the course of writing this article.

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).

## Citation

Please cite this document as:

Fernando Mendes and Joshua Z. Tan, “Attestations for DAOs Working Paper”, July 8, 2022.
