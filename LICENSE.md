# LOPSwap Source-Available License 1.0

Copyright © 2024. All rights reserved.

License Identifier: `LicenseRef-LOPSwap-Source-1.0`

## 1. Definitions

**“Licensed Work”** means the software and other materials made available under
this License, including source code, compiled or object code, smart contracts,
ABIs, deployment scripts, configuration, tests, documentation, and associated
developer tooling. Third-Party Components are excluded from this definition to
the extent they are governed by separate license terms.

**“Licensor”** means each person or legal entity that owns copyright or other
licensable rights in a portion of the Licensed Work and makes that portion
available under this License.

**“You”** means the individual or legal entity exercising rights under this
License. For a legal entity, “You” includes entities that control, are controlled
by, or are under common control with that entity. “Control” means direct or
indirect power to direct management or policies, whether through ownership,
contract, or otherwise.

**“Modification”** means a change to the Licensed Work or a work based on or
incorporating a copyrightable portion of the Licensed Work. Independent software
that merely communicates with the Licensed Work through a published interface,
without incorporating or copying the Licensed Work, is not a Modification.

**“Published Interface Materials”** means ABIs, interface declarations,
function, event, and error signatures, schemas, contract addresses, and related
technical documentation intentionally published by a Licensor to enable
interoperability with the Licensed Work.

**“Official Deployment”** means an instance of the Licensed Work deployed or
expressly authorized by a Licensor and identified by that Licensor as official
in the repository, official documentation, or another official publication.

**“Protocol Interaction”** means reading state from or submitting calls or
transactions to an Official Deployment through Published Interface Materials.
It includes forming calldata, signing or relaying transactions, submitting or
resolving orders, routing transactions, and operating infrastructure for those
purposes.

**“Independent Integration”** means independently developed software that
interacts with an Official Deployment through Published Interface Materials
without incorporating or copying copyrightable implementation code from the
Licensed Work. Independent Integrations may include SDKs, applications,
frontends, adapters, bots, resolvers, routers, indexers, analytics tools, and
transaction or order-relaying services. Reproducing Published Interface
Materials only to the extent reasonably necessary for interoperability does not
make software a Modification.

**“Development Services”** means compensated or uncompensated professional
services to inspect, test, audit, evaluate, modify, or contribute to the
Licensed Work in a non-production environment, including delivery of resulting
Modifications to the person that commissioned the services.

**“Production Network”** means a blockchain or other distributed ledger that:

1. records, transfers, controls, or accounts for assets or transactions having
   actual or reasonably expected economic value; or
2. is used to provide an operational product or service to actual users.

A local development network, isolated simulation, private fork incapable of
settling transactions on its source network, or test network not intended to
carry assets of economic value is not a Production Network.

**“Production Deployment”** means deploying or causing the deployment of the
Licensed Work or a Modification on a Production Network, or controlling,
administering, operating, or upgrading such a deployed instance, directly or
through a proxy, clone, factory, `delegatecall`, or substantially equivalent
mechanism. Protocol Interaction and deployment or operation of an Independent
Integration are not Production Deployment.

**“Commercial Use”** means exercising copyright or patent rights granted by this
License in the Licensed Work or a Modification as part of a product, service, or
activity intended for commercial advantage or monetary compensation. Commercial
Use does not include Protocol Interaction, developing or operating an
Independent Integration, Security Audit and Evaluation permitted by Section 4,
Development Services permitted by Section 4, or good-faith publication of the
Licensed Work or Modifications under Section 3, even if those activities are
performed for compensation or other economic benefit.

**“Security Audit and Evaluation”** means good-faith inspection, compilation,
testing, simulation, static or dynamic analysis, security research, preparation
of proofs of concept, and evaluation for possible future use or licensing.

**“Third-Party Component”** means any portion of the Licensed Work identified as
being owned by a third party or governed by separate license terms.

## 2. License Grant

Subject to compliance with this License, each Licensor grants You a worldwide,
non-exclusive, royalty-free, non-transferable, non-sublicensable license under
that Licensor’s copyright in the Licensed Work to:

1. inspect and study the Licensed Work;
2. copy, compile, execute, test, simulate, and analyze the Licensed Work in a
   non-production environment;
3. create Modifications in a non-production environment;
4. conduct Security Audit and Evaluation and Development Services as provided
   in Section 4;
5. distribute the Licensed Work and Modifications only as provided in Section 3;
6. engage in Protocol Interaction, including for commercial purposes; and
7. reproduce and distribute Published Interface Materials to the extent
   reasonably necessary to develop, distribute, deploy, or operate an
   Independent Integration, including for commercial purposes and under terms
   of Your choice.

For clarity, You may charge fees or receive other economic benefit for Protocol
Interaction, an Independent Integration, Security Audit and Evaluation, or
Development Services. This permission does not allow a Production Deployment of
the Licensed Work or a Modification. Except for the activities expressly
permitted above, no right to Production Deployment or Commercial Use is granted
by this License.

## 3. Distribution and Publication of Modifications

You may publish and distribute the Licensed Work or Modifications, in source
form or as non-production build artifacts, only if You satisfy all of the
following:

1. a public distribution is made at no charge and is not sold or licensed for a
   fee; however, compensation for Development Services and private delivery of
   the resulting work to the person that commissioned those services are
   permitted;
2. the complete corresponding source code is made available with the
   distribution, in the preferred form for making modifications, at no charge
   except that a service provider may charge the commissioning party for
   Development Services;
3. the entire Licensed Work and every Modification is provided under this exact
   License, without additional terms that restrict or expand the rights granted
   by this License;
4. You include a complete copy of this License;
5. You preserve all copyright, license, attribution, and Third-Party Component
   notices;
6. You clearly identify material changes and the date of each material change;
7. You provide build and test instructions reasonably sufficient to reproduce
   distributed build artifacts; and
8. the distribution is not made as part of, for the purpose of, or together
   with a Production Deployment.

Compensation for Development Services is payment for the services and does not
sell, sublicense, or grant production rights in the Licensed Work or a
Modification. A commissioning party that receives a Modification obtains only
the rights granted by this License and must obtain a separate written license
before any Production Deployment or other Commercial Use not expressly
permitted by Section 2.

This Section does not apply to an Independent Integration that is not a
Modification, except that any Published Interface Materials included in it may
be used only as permitted by Section 2.

You may not represent that a Modification is an official version of the Licensed
Work or that it is endorsed by the Licensor.

## 4. Security Audit, Evaluation, and Development Services

You may conduct Security Audit and Evaluation whether or not You receive
compensation for doing so. For that limited purpose, You may make temporary or
internal Modifications, develop test harnesses and proofs of concept, reproduce
the Licensed Work within the audit or evaluation team, and provide findings to
the party that requested the audit or evaluation.

You may publish a good-faith audit or research report and may reproduce in that
report the limited portions of the Licensed Work reasonably necessary to explain
the findings. Publication of findings and good-faith submission of fixes does not
become Commercial Use solely because the work was compensated.

You may perform Development Services and privately deliver resulting
Modifications to the person that commissioned the services, whether or not You
receive compensation. Both the service provider and the commissioning party
remain bound by this License. The commissioning party may test and evaluate the
delivered work in a non-production environment and may publish or redistribute
it only under Section 3. Payment for Development Services does not grant either
party a right to Production Deployment.

This Section does not permit You to:

1. exploit or facilitate exploitation of a vulnerability;
2. perform a Production Deployment;
3. operate a Production Deployment or any other product or service that copies
   or incorporates the Licensed Work or a Modification, except for an activity
   expressly permitted by Section 2; or
4. distribute the Licensed Work or Modifications except as permitted by Section 3.

## 5. Production and Commercial Licensing

Any Production Deployment of the Licensed Work or a Modification, whether
commercial or non-commercial, and any Commercial Use not expressly permitted by
Section 2 require a separate written agreement between You and the relevant
Licensor. Requesting, negotiating, or expecting such an agreement grants no
rights by itself. No Licensor is obligated to offer a separate license or to
publish standard terms.

A separate commercial agreement may grant broader rights and may override this
License for the parties and subject matter expressly identified in that agreement.

You may not enable, direct, or knowingly assist another person to perform a
Production Deployment or Commercial Use that would require a separate license.
Providing an Independent Integration, engaging in Protocol Interaction, or
performing Development Services without participating in an unauthorized
Production Deployment does not by itself violate this paragraph.

## 6. Patent License and Patent Defense

Subject to compliance with this License, each Licensor grants You a worldwide,
non-exclusive, royalty-free patent license under patent claims that the Licensor
can license, solely to the extent necessary to exercise the rights expressly
granted by this License.

If You or an entity under common control with You initiate a written claim that
the Licensed Work infringes a patent, every patent license granted to You under
this License terminates immediately.

## 7. Third-Party Components

Third-Party Components remain governed by their respective license terms. This
License neither limits rights granted by those terms nor grants rights that the
Licensor does not possess. You must preserve and comply with all applicable
third-party copyright, attribution, and license notices.

## 8. Ownership, Attribution, and Trademarks

The Licensed Work is licensed, not sold. Each Licensor retains all rights not
expressly granted by this License.

This License grants no right to use any trade name, trademark, service mark, or
logo, except as reasonably necessary to describe the origin of the Licensed Work
and reproduce required notices. You may not imply sponsorship, endorsement, or
affiliation without separate written permission.

## 9. Compliance and Termination

Your rights under this License terminate automatically when You violate its
terms. If this is Your first violation of this License, Your rights will be
reinstated if You cease the violation, cure its effects to the extent reasonably
possible, and confirm compliance within thirty days after receiving written
notice from a Licensor.

Intentional Production Deployment or Commercial Use without a required separate
license is not eligible for automatic reinstatement. Reinstatement in that case
requires the Licensor’s express written consent.

Termination does not affect obligations or liabilities arising before
termination. Sections 3, 7, 8, 10, 11, and 12 survive termination to the extent
necessary to give them effect.

## 10. Disclaimer of Warranty

TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, THE LICENSED WORK IS PROVIDED
“AS IS” AND “AS AVAILABLE,” WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND,
EXPRESS, IMPLIED, OR STATUTORY, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE, TITLE, NON-INFRINGEMENT, SECURITY, CORRECTNESS, OR
UNINTERRUPTED OPERATION.

## 11. Limitation of Liability

TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, NO LICENSOR WILL BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, CONSEQUENTIAL, OR PUNITIVE
DAMAGES, OR FOR ANY LOSS OF ASSETS, FUNDS, PROFITS, REVENUE, DATA, GOODWILL, OR
BUSINESS OPPORTUNITY, ARISING FROM OR RELATED TO THE LICENSED WORK OR THIS
LICENSE, UNDER ANY LEGAL THEORY, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH
DAMAGES.

## 12. General Terms

This License does not restrict rights that applicable law grants independently
of copyright or contract and that cannot lawfully be restricted.

If any provision is held unenforceable, it will be limited or modified only to
the minimum extent necessary, and the remaining provisions will continue in
effect. Failure to enforce a provision is not a waiver.

This License applies separately to each release that identifies it. It does not
automatically convert to another license after any period of time. A later
license version applies only when a Licensor expressly applies it to a release.
Each Licensor may also offer the Licensed Work under separate terms.

This document is the entire public license for the release to which it is
applied. It does not revoke rights validly granted for an earlier release and
does not supersede a separately executed written agreement.
