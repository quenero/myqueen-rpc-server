// Copyright (c) 2014-2020, MyMonero.com
//
// All rights reserved.
//
// Redistribution and use in source and binary forms, with or without modification, are
// permitted provided that the following conditions are met:
//
// 1. Redistributions of source code must retain the above copyright notice, this list of
//	conditions and the following disclaimer.
//
// 2. Redistributions in binary form must reproduce the above copyright notice, this list
//	of conditions and the following disclaimer in the documentation and/or other
//	materials provided with the distribution.
//
// 3. Neither the name of the copyright holder nor the names of its contributors may be
//	used to endorse or promote products derived from this software without specific
//	prior written permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY
// EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
// MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL
// THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
// SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
// PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
// INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT,
// STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF
// THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//
const ServerBase = require('./rpc_server_base')
const methods = require('./wallet_rpc_methods')
const supported_method_names = Object.keys(methods)
//
class WalletRPCServer extends ServerBase
{
    constructor(options)
    {
        options.port = options.port || 19082
        options.server_name = options.server_name || "Queenero Wallet RPC server"
        //
        if (typeof options.document_store == 'undefined' || !options.document_store) {
            throw "WalletRPCServer requires options.document_store"
        }
        super(options)
        //
        this.document_store = options.document_store // store for runtime access
    }
    //
    // Accessors
    DocumentStore()
    { // made an accessor for this to standardize the store's availability
        return this.document_store
    }
    //
    // Internal - Delegation
    _overridable_didReceiveReq(optl__rpc_req_id, method_name, optl__params, res)
    {
        const self = this
        if (supported_method_names.indexOf(method_name) == -1) {
            self._write_error(400, "Unrecognized .method", res)
            return
        }
        console.log("[wallet_rpc_server/"+method_name+"]")
        methods[method_name](
            optl__rpc_req_id || "0", optl__params, self /*callers can access self.DocumentStore()*/, res
        ).then(function(r) {
            if (typeof r !== 'undefined') {
                throw "Not expecting a return value here"
            }
        }).catch(function(e) {
            console.error("Error in wallet_rpc_server method " + method_name + " call:", e)
        })
    }
}
module.exports = WalletRPCServer
