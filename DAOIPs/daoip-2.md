---
daoip: 2
title: Common Interfaces for DAOs
description: An API for decentralized autonomous organizations (DAOs).
author: Joshua Tan (@thelastjosh), Isaac Patka (@ipatka), Ido Gershtein <ido@daostack.io>, Eyal Eithcowich <eyal@deepdao.io>, Michael Zargham (@mzargham), Sam Furter (@nivida)
discussions-to: https://ethereum-magicians.org/t/eip-4824-decentralized-autonomous-organizations/8362
status: Draft
type: Standards Track
category: ERC
created: 2022-02-17
---

## Abstract

An API standard for decentralized autonomous organizations (DAOs), focused on relating on-chain and off-chain representations of membership and proposals.

## Motivation

DAOs, since being invoked in the Ethereum whitepaper, have been vaguely defined. This has led to a wide range of patterns but little standardization or interoperability between the frameworks and tools that have emerged. Standardization and interoperability are necessary to support a variety of use-cases. In particular, a standard daoURI, similar to tokenURI in [EIP-721](./eip-721), will enhance DAO discoverability, legibility, proposal simulation, and interoperability between tools. More consistent data across the ecosystem is also a prerequisite for future DAO standards.

## Specification

The key words “MUST”, “MUST NOT”, “REQUIRED”, “SHALL”, “SHALL NOT”, “SHOULD”, “SHOULD NOT”, “RECOMMENDED”, “MAY”, and “OPTIONAL” in this document are to be interpreted as described in RFC 2119.

Every contract implementing this EIP MUST implement the `EIP4824` interface below:

```solidity
pragma solidity ^0.8.1;

/// @title EIP-4824 Common Interfaces for DAOs
/// @dev See https://eips.ethereum.org/EIPS/eip-4824

interface EIP4824 {
    /// @notice A distinct Uniform Resource Identifier (URI) pointing to a JSON object following the "EIP-4824 DAO JSON-LD Schema". This JSON file splits into four URIs: membersURI, proposalsURI, activityLogURI, and governanceURI. The membersURI should point to a JSON file that conforms to the "EIP-4824 Members JSON-LD Schema". The proposalsURI should point to a JSON file that conforms to the "EIP-4824 Proposals JSON-LD Schema". The activityLogURI should point to a JSON file that conforms to the "EIP-4824 Activity Log JSON-LD Schema". The governanceURI should point to a flatfile, normatively a .md file. Each of the JSON files named above can be statically-hosted or dynamically-generated.
    function daoURI() external view returns (string _daoURI);
}
```

The DAO JSON-LD Schema mentioned above:

```json
{
    "@context": "http://www.daostar.org/schemas",
    "type": "DAO",
    "name": "<name of the DAO>",
    "description": "<description>",
    "membersURI": "<URI>",
    "proposalsURI": "<URI>",
    "activityLogURI": "<URI>",
    "governanceURI": "<URI>"
}
```

A DAO MAY inherit the above interface above or it MAY create an external registration contract that is compliant with this EIP. The external registration contract MUST store the DAO’s primary address.

```solidity
pragma solidity ^0.8.1;

/// @title EIP-4824 Common Interfaces for DAOs
/// @dev See <https://eips.ethereum.org/EIPS/eip-4824>

error NotOwner();
error NotOffered();

contract EIP4824Registration is EIP4824 {
    string private _daoURI;
    address daoAddress;

    event NewURI(string daoURI);

    constructor() {
        daoAddress = address(0xdead);
    }

    function initialize(address _daoAddress, string memory daoURI_) external {
        if (daoAddress != address(0)) revert AlreadyInitialized();
        daoAddress = _daoAddress;
        _daoURI = daoURI_;
    }

    function setURI(string memory daoURI_) external {
        if (msg.sender != daoAddress) revert NotOwner();
        _daoURI = daoURI_;
        emit NewURI(daoURI_);
    }

    function daoURI() external view returns (string memory daoURI_) {
        return _daoURI;
    }
}
```

If a DAO uses an external registration contract, the DAO SHOULD use a common registration factory contract to enable efficient network indexing.

```solidity
pragma solidity ^0.8.1;

/// @title EIP-4824 Common Interfaces for DAOs
/// @dev See <https://eips.ethereum.org/EIPS/eip-4824>

contract CloneFactory {
    // implementation of eip-1167 - see https://eips.ethereum.org/EIPS/eip-1167
    function createClone(address target) internal returns (address result) {
        bytes20 targetBytes = bytes20(target);
        assembly {
            let clone := mload(0x40)
            mstore(
                clone,
                0x3d602d80600a3d3981f3363d3d373d3d3d363d73000000000000000000000000
            )
            mstore(add(clone, 0x14), targetBytes)
            mstore(
                add(clone, 0x28),
                0x5af43d82803e903d91602b57fd5bf30000000000000000000000000000000000
            )
            result := create(0, clone, 0x37)
        }
    }
}

contract EIP4824RegistrationFactory is CloneFactory {
    event NewRegistration(
        address indexed daoAddress,
        string daoURI,
        address registration
    );

    address public template; /*Template contract to clone*/

    constructor(address _template) public {
        template = _template;
    }

    function summonRegistration(string calldata daoURI_) external {
        EIP4824Registration reg = EIP4824Registration(createClone(template)); /*Create a new clone of the template*/
        reg.initialize(msg.sender, daoURI_);
        emit NewRegistration(msg.sender, daoURI_, address(reg));
    }
}
```

### Members

Members JSON-LD Schema.

```json
{
    "@context": "<http://www.daostar.org/schemas>",
    "type": "DAO",
    "name": "<name of the DAO>",
    "members": [
        {
            "type": "EthereumAddress",
            "id": "<address or other identifier>"
        },
        {
            "type": "EthereumAddress",
            "id": "<address or other identifier>"
        }
    ]
}
```

### Proposals

Proposals JSON-LD Schema. Every contract implementing this EIP should implement a proposalsURI pointing to a JSON object satisfying this schema.

In particular, any on-chain proposal MUST be associated to an id of the form CAIP10_ADDRESS + “?proposalId=” + PROPOSAL_COUNTER, where CAIP10_ADDRESS is an address following the CAIP-10 standard and PROPOSAL_COUNTER is an arbitrary identifier such as a uint256 counter or a hash that is locally unique per CAIP-10 address. Off-chain proposals MAY use a similar id format where CAIP10_ADDRESS is replaced with an appropriate URI or URL.

```json
{
    "@context": "http://www.daostar.org/schemas",
    "type": "DAO",
    "name": "<name of the DAO>",
    "proposals": [
        {
            "type": "proposal",
            "id": "<proposal ID>",
            "name": "<name or title of proposal>",
            "contentURI": "<URI to content or discussion>",
            "status": "<status of proposal>",
            "calls": [
                {
                    "type": "CallDataEVM",
                    "operation": "<call or delegate call>",
                    "from": "<EthereumAddress>",
                    "to": "<EthereumAddress>",
                    "value": "<value>",
                    "data": "<call data>"
                }
            ]
        }
    ]
}
```

### Activity Log

Activity Log JSON-LD Schema.

```json
{
    "@context": "<http://www.daostar.org/schemas>",
    "type": "DAO",
    "name": "<name of the DAO>",
    "activities": [
        {
            "id": "<activity ID>",
            "type": "activity",
            "proposal": {
                "id": "<proposal ID>",
                "type": "proposal"
            },
            "member": {
                "type": "EthereumAddress",
                "id": "<address or other identifier>"
            }
        }, 
    ],
    "activities": [
        {
            "id": "<activity ID>",
            "type": "activity",
            "proposal": {
                "id": "<proposal ID>",
                "type": "proposal"
            },
            "member": {
                "type": "EthereumAddress",
                "id": "<address or other identifier>"
            }
        }
    ]
}
```

## Rationale

In this standard, we assume that all DAOs possess at least two primitives: *membership* and *behavior*. *Membership* is defined by a set of addresses. *Behavior* is defined by a set of possible contract actions, including calls to external contracts and calls to internal functions. *Proposals* relate membership and behavior; they are objects that members can interact with and which, if and when executed, become behaviors of the DAO.

### APIs, URIs, and off-chain data

DAOs themselves have a number of existing and emerging use-cases. But almost all DAOs need to publish data off-chain for a number of reasons: communicating to and recruiting members, coordinating activities, powering user interfaces and governance applications such as Snapshot or Tally, or enabling search and discovery via platforms like DeepDAO, Messari, and Etherscan. Having a standardized schema for this data organized across multiple URIs, i.e. an API specification, would strengthen existing use-cases for DAOs, help scale tooling and frameworks across the ecosystem, and build support for additional forms of interoperability.

While we considered standardizing on-chain aspects of DAOs in this standard, particularly on-chain proposal objects and proposal IDs, we felt that this level of standardization was premature given (1) the relative immaturity of use-cases, such as multi-DAO proposals or master-minion contracts, that would benefit from such standardization, (2) the close linkage between proposal systems and governance, which we did not want to standardize (see “governanceURI”, below), and (3) the prevalence of off-chain and L2 voting and proposal systems in DAOs (see “proposalsURI”, below). Further, a standard URI interface is relatively easy to adopt and has been actively demanded by frameworks (see “Community Consensus”, below).

### membersURI

Approaches to membership vary widely in DAOs. Some DAOs and DAO frameworks (e.g. Gnosis Safe, Tribute), maintain an explicit, on-chain set of members, sometimes called owners or stewards. But many DAOs are structured so that membership status is based on the ownership of a token or tokens (e.g. Moloch, Compound, DAOstack, 1Hive Gardens). In these DAOs, computing the list of current members typically requires some form of off-chain indexing of events.

In choosing to ask only for an (off-chain) JSON schema of members, we are trading off some on-chain functionality for more flexibility and efficiency. We expect different DAOs to use membersURI in different ways: to serve a static copy of on-chain membership data, to contextualize the on-chain data (e.g. many Gnosis Safe stewards would not say that they are the only members of the DAO), to serve consistent membership for a DAO composed of multiple contracts, or to point at an external service that computes the list, among many other possibilities. We also expect many DAO frameworks to offer a standard endpoint that computes this JSON file, and we provide a few examples of such endpoints in the implementation section.

We encourage extensions of the Membership JSON-LD Schema, e.g. for DAOs that wish to create a state variable that captures active/inactive status or different membership levels.

### proposalsURI

Proposals have become a standard way for the members of a DAO to trigger on-chain actions, e.g. sending out tokens as part of grant or executing arbitrary code in an external contract. In practice, however, many DAOs are governed by off-chain decision-making systems on platforms such as Discourse, Discord, or Snapshot, where off-chain proposals may function as signaling mechanisms for an administrator or as a prerequisite for a later on-chain vote. (To be clear, on-chain votes may also serve as non-binding signaling mechanisms or as “binding” signals leading to some sort of off-chain execution.) The schema we propose is intended to support both on-chain and off-chain proposals, though DAOs themselves may choose to report only on-chain, only off-chain, or some custom mix of proposal types.

**Proposal ID**. Every unique on-chain proposal MUST be associated to a proposal ID of the form CAIP10_ADDRESS + “?proposalId=” + PROPOSAL_COUNTER, where PROPOSAL_COUNTER is an arbitrary string which is unique per CAIP10_ADDRESS. Note that PROPOSAL_COUNTER may not be the same as the on-chain representation of the proposal; however, each PROPOSAL_COUNTER should be unique per CAIP10_ADDRESS, such that the proposal ID is a globally unique identifier. We endorse the CAIP-10 standard to support multi-chain / layer 2 proposals and the “?proposalId=” query syntax to suggest off-chain usage.

**ContentURI**. In many cases, a proposal will have some (off-chain) content such as a forum post or a description on a voting platform which predates or accompanies the actual proposal.

**Status**. Almost all proposals have a status or state, but the actual status is tied to the governance system, and there is no clear consensus between existing DAOs about what those statuses should be (see table below). Therefore, we have defined a “status” property with a generic, free text description field.

| Project | Proposal Statuses |
| --- | --- |
| Aragon | Not specified |
| Colony | [‘Null’, ‘Staking’, ‘Submit’, ‘Reveal’, ‘Closed’, ‘Finalizable’, ‘Finalized’, ‘Failed’] |
| Compound | [‘Pending’, ‘Active’, ‘Canceled’, ‘Defeated’, ‘Succeeded’, ‘Queued’, ‘Expired’, ‘Executed’] |
| DAOstack/ Alchemy | [‘None’, ‘ExpiredInQueue’, ‘Executed’, ‘Queued’, ‘PreBoosted’, ‘Boosted’, ‘QuietEndingPeriod’] |
| Moloch v2 | [sponsored, processed, didPass, cancelled, whitelist, guildkick] |
| Tribute | [‘EXISTS’, ‘SPONSORED’, ‘PROCESSED’] |

**ExecutionData**. For on-chain proposals with non-empty execution, we include an array field to expose the call data. The main use-case for this data is execution simulation of proposals.

### activityLogURI

The activity log JSON is intended to capture the interplay between a member of a DAO and a given proposal. Examples of activities include the creation/submission of a proposal, voting on a proposal, disputing a proposal, and so on.

*Alternatives we considered: history, interactions*

### governanceURI

Membership, to be meaningful, usually implies rights and affordances of some sort, e.g. the right to vote on proposals, the right to ragequit, the right to veto proposals, and so on. But many rights and affordances of membership are realized off-chain (e.g. right to vote on a Snapshot, gated access to a Discord). Instead of trying to standardize these wide-ranging practices or forcing DAOs to locate descriptions of those rights on-chain, we believe that a flatfile represents the easiest and most widely-acceptable mechanism for communicating what membership means and how proposals work. These flatfiles can then be consumed by services such as Etherscan, supporting DAO discoverability and legibility.

We chose the word “governance” as an appropriate word that reflects (1) the widespread use of the word in the DAO ecosystem and (2) the common practice of emitting a governance.md file in open-source software projects.

*Alternative names considered: description, readme, constitution*

### Why JSON-LD

We chose to use JSON-LD rather than the more widespread and simpler JSON standard because (1) we want to support use-cases where a DAO wants to include members using some other form of identification than their Ethereum address and (2) we want this standard to be compatible with future multi-chain standards. Either use-case would require us to implement a context and type for addresses, which is already implemented in JSON-LD.

Further, given the emergence of patterns such as subDAOs and DAOs of DAOs in large organizations such as Synthetix, as well as L2 and multi-chain use-cases, we expect some organizations will point multiple DAOs to the same URI, which would then serve as a gateway to data from multiple contracts and services. The choice of JSON-LD allows for easier extension and management of that data.

### **Community Consensus**

The initial draft standard was developed as part of the DAOstar One roundtable series, which included representatives from all major EVM-based DAO frameworks (Aragon, Compound, DAOstack, Gnosis, Moloch, OpenZeppelin, and Tribute), a wide selection of DAO tooling developers, as well as several major DAOs. Thank you to all the participants of the roundtable. We would especially like to thank Auryn Macmillan, Fabien of Snapshot, Selim Imoberdorf, Lucia Korpas, and Mehdi Salehi for their contributions.

In-person events will be held at Schelling Point 2022 and at ETHDenver 2022, where we hope to receive more comments from the community. We also plan to schedule a series of community calls through early 2022.

## Backwards Compatibility
Existing contracts that do not wish to use this specification are unaffected. DAOs that wish to adopt the standard without updating or migrating contracts can do so via an external registration contract.

## Security Considerations

This standard defines the interfaces for the DAO URIs but does not specify the rules under which the URIs are set, or how the data is prepared. Developers implementing this standard should consider how to update this data in a way aligned with the DAO’s governance model, and keep the data fresh in a way that minimizes reliance on centralized service providers.

Indexers that rely on the data returned by the URI should take caution if DAOs return executable code from the URIs. This executable code might be intended to get the freshest information on membership, proposals, and activity log, but it could also be used to run unrelated tasks.

## Copyright
Copyright and related rights waived via [CC0](../LICENSE.md).
