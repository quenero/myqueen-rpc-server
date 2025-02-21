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
const myqueenero_core = require('../myqueenero-ws-client/myqueenero-core-js')
const nettype = myqueenero_core.nettype_utils.network_type.MAINNET // TODO: pass via server options or method function args
function mnemonic_language_to_code(language)
{ // this can potentially be moved out
    switch (language) {
        case "English":
            return "en"
        case "Deutsch":
            return "de"
        case "Español":
            return "es"
        case "Français":
            return "fr"
        case "Italiano":
            return "it"
        case "Nederlands":
            return "nl"
        case "Português":
            return "pt"
        case "日本語":
            return "ja"
        case "русский язык":
            return "ru"
        case "简体中文 (中国)":
            return "zh"
        case "Esperanto":
            return "eo"
        case "Lojban":
            return "jbo"
        default:
            throw "Unrecognized language"
    }
}
//
const cryptor = require('./symmetric_string_cryptor')
async function _contents_of_file_named(store, filename)
{
    let raw_str = await store.read_stringInFileNamed(filename)
    if (typeof raw_str == 'undefined') {
        return raw_str
    }
    return raw_str
}
async function _does_file_exist_named(store, filename) {
    let raw_str = await _contents_of_file_named(store, filename)
    if (raw_str) {
        return true
    }
    return false
}
async function _read_wallet_json_for_file_named(store, filename, password)
{
    let raw_str = await _contents_of_file_named(store, filename)
    if (!raw_str) {
        return null // wallet does not exist on disk yet
    }
    let plain_str = await cryptor.New_DecryptedString__Promise(raw_str, password)
    return JSON.parse(plain_str) // thrown exception will 'reject'
}
async function _write_wallet_json_for_file_named(store, filename, password, plain_doc)
{
    let str = await cryptor.New_EncryptedBase64String__Promise(JSON.stringify(plain_doc), password)
    await store.write(filename, str)
}
//
async function _store_wallet_with(
    store,
    filename, password,
    address, 
    view_key, spend_key, 
    pub_spend_key, pub_view_key,
    mnemonic, mnemonic_language
) {
    const plain_doc = 
    {
        address: address, 
        view_key: view_key, 
        spend_key: spend_key, 
        pub_spend_key: pub_spend_key, 
        pub_view_key: pub_view_key,
        mnemonic: mnemonic, 
        mnemonic_language: mnemonic_language
    }
    await _write_wallet_json_for_file_named(store, filename, password, plain_doc)
}
var __wallet_timeout_til_save = null
async function __givenOpenWallet_write()
{
    let addr = opened_wallet_struct__address()
    opened_wallet_struct.doc.last_confirmed_tx_id = ws_client.last_confirmed_tx_id_for_addr__orNull(addr)
    opened_wallet_struct.doc.last_confirmed_tx_block_hash = ws_client.last_confirmed_tx_block_hash_for_addr__orNull(addr)
    opened_wallet_struct.doc.block_hash_by_confirmed_tx_id_by_addr = ws_client.block_hash_by_confirmed_tx_id_by_addr__orNull(addr)
    //
    // console.log("~> opened_wallet_struct.doc", opened_wallet_struct.doc)
    return await _write_wallet_json_for_file_named(
        opened_wallet_struct.wallet_store, 
        opened_wallet_struct.filename, 
        opened_wallet_struct.password, 
        opened_wallet_struct.doc
    )
}
//
const queenero_txParsing_utils = require('../myqueenero-ws-client/myqueenero-core-js/queenero_utils/queenero_txParsing_utils')
const queenero_keyImage_cache_utils = require("../myqueenero-ws-client/myqueenero-core-js/queenero_utils/queenero_keyImage_cache_utils");
//
async function _got_tx(raw_tx)
{
    if (opened_wallet_struct == null) {
        console.warn("[_got_tx] but no open wallet")
        return
    }
    let address = opened_wallet_struct__address()
    let keyImage_cache = queenero_keyImage_cache_utils.Lazy_KeyImageCacheForWalletWith(address)
    let tx_orNil = queenero_txParsing_utils.ownedParsedTxFrom__orNil(
        raw_tx,
        address,
        opened_wallet_struct__view_key__sec(),
        opened_wallet_struct__spend_key__pub(),
        opened_wallet_struct__spend_key__sec(),
        keyImage_cache,
        (await myqueenero_core.queenero_utils_promise)
    )
    if (tx_orNil == null) {
        return // discard
    }
    __keep_parsed_tx(tx_orNil)
}
function __keep_parsed_tx(final_tx)
{
    if (opened_wallet_struct == null) {
        throw "[__keep_parsed_tx] but no open wallet"
    }
    if (typeof opened_wallet_struct.doc.txs_by_hash == 'undefined' || !opened_wallet_struct.doc.txs_by_hash) {
        opened_wallet_struct.doc.txs_by_hash = {}
    }

    if (typeof final_tx.id == 'undefined' || !final_tx.id) {
        console.warn("=====>>>>>> [__keep_parsed_tx] final_tx.id is nil or undefined", final_tx)
    }

    opened_wallet_struct.doc.txs_by_hash[final_tx.hash] = final_tx
    //
    __save_wallet_after_delay_unless_canceled()
}
function _forget_txs_from(from_tx_id, for_address)
{
    if (opened_wallet_struct == null) {
        throw "[_forget_txs_from] but no open wallet"
    }
    if (typeof opened_wallet_struct.doc.txs_by_hash == 'undefined' || !opened_wallet_struct.doc.txs_by_hash) {
        opened_wallet_struct.doc.txs_by_hash = {}
    } // ^---- just gonna set this up here even though it'll eventually get saved ... for the purpose of convenience in later code 
    //
    // Note: the deletion of txs must be per-address - cannot apply from_tx_id to some other addr
    let from_tx_id__JSBigInt = new JSBigInt("" + from_tx_id) // from_tx_id should be a string, fwiw
    let changed_any = false
    const tx_hashes = Object.keys(opened_wallet_struct.doc.txs_by_hash)
    for (var i = 0 ; i < tx_hashes.length ; i++) {
        let tx_hash = tx_hashes[i]
        let tx = opened_wallet_struct.doc.txs_by_hash[tx_hash]
        if (typeof tx.id === 'undefined' || tx.id === null || tx.id === ''/*expected?*/) {
            console.log("Skipping tx "+tx_hash+" bc it doesnt have an id")
            continue // skip txs w/o id as they cannot be compared for 'forget'
        }
        let tx_id__JSBigInt = new JSBigInt("" + tx.id) // tx.id should be a JS number, fwiw - but this is future proofed for strings too
        console.log(tx_id__JSBigInt+".subtract("+from_tx_id__JSBigInt+") ", tx_id__JSBigInt.subtract(from_tx_id__JSBigInt))
        console.log(tx_id__JSBigInt+".subtract("+from_tx_id__JSBigInt+").compare(0) ", tx_id__JSBigInt.subtract(from_tx_id__JSBigInt).compare(0))
        if (tx_id__JSBigInt.subtract(from_tx_id__JSBigInt).compare(0) <= 0) { // if the from_tx_id >= tx_id 
            delete opened_wallet_struct.doc.txs_by_hash[tx_hash] // remove
            changed_any
        }
    }
    if (changed_any) {
        __save_wallet_after_delay_unless_canceled()
    }
}
function _confirm_tx(tx_id, tx_hash, tx_height, tx_block_hash)
{
    if (opened_wallet_struct == null) {
        throw "[_confirm_tx] but no open wallet"
    }
    //
    if (typeof opened_wallet_struct.doc.txs_by_hash == 'undefined' || !opened_wallet_struct.doc.txs_by_hash) {
        opened_wallet_struct.doc.txs_by_hash = {}
    } // ^---- just gonna set this up here even though it'll eventually get saved ... for the purpose of convenience in later code 
    //
    let expected_tx = opened_wallet_struct.doc.txs_by_hash[tx_hash]
    if (typeof expected_tx == 'undefined' || !expected_tx) {
        throw "[_confirm_tx] Expected tx for hash " + tx_hash
    }
    // fill in confirmation / block-inclusion info
    expected_tx.id = tx_id
    expected_tx.height = tx_height
    expected_tx.block_hash = tx_block_hash
    opened_wallet_struct.doc.txs_by_hash[tx_hash] = expected_tx
    //
    __save_wallet_after_delay_unless_canceled()
}
async function __save_wallet_after_delay_unless_canceled()
{
    if (__wallet_timeout_til_save) {
        clearTimeout(__wallet_timeout_til_save)
    }
    __wallet_timeout_til_save = setTimeout(async function()
    {
        if (opened_wallet_struct == null) {
            console.warn("[__save_wallet_after_delay_unless_canceled] warning: __save_wallet_after_delay_unless_canceled timeout called but no wallet currently open. Not calling _write_….")
            return 
        }
        await __givenOpenWallet_write()
    }, 50) // if no subsequent updates T ms, save
}
//
//
var opened_wallet_struct = null
function opened_wallet_struct__address()
{
    return opened_wallet_struct.doc.address
}
function opened_wallet_struct__view_key__sec()
{
    return opened_wallet_struct.doc.view_key
}
function opened_wallet_struct__seed()
{
    return opened_wallet_struct.doc.mnemonic
}
function opened_wallet_struct__spend_key__pub()
{
    return opened_wallet_struct.doc.pub_spend_key
}
function opened_wallet_struct__spend_key__sec()
{
    return opened_wallet_struct.doc.spend_key
}

async function _open_wallet(store, filename, password)
{
    let doc = await _read_wallet_json_for_file_named(store, filename, password)
    if (doc == null) {
        throw new Error("[_open_wallet] Doc with filename ("+filename+") doesn't exist")
    }
    opened_wallet_struct = 
    {
        filename: filename,
        password: password, // kept in mem for subsequent writes on receipt of a tx or other update
        wallet_store: store, // hanging onto this here ... unclear if there's a better way than factoring much of this into a wallet class and passing the store to the wallet itself
        doc: doc
    }
    ws_client.populate_from_saved_wallet(
		doc.address,
		doc.last_confirmed_tx_id,
		doc.last_confirmed_tx_block_hash,
		doc.block_hash_by_confirmed_tx_id
	) // after opening saved doc / prior to ws connection attempt    
    let r = await __givenOpenWallet_open_ws()
    //
    return doc
}
//
//
const ws_wireformat = require('../myqueenero-ws-client/ws/ws_wireformat')
const WSErrorCode = ws_wireformat.WSErrorCode
const WSTransport = require("../myqueenero-ws-client/ws/ws_transport.real")
const WSClient = require('../myqueenero-ws-client/ws/ws_client')
const WSFeedPool = require('../myqueenero-ws-client/ws/ws_feed_pool')
//
const ws_transport = new WSTransport({
    ws_url_base: "ws://localhost:8888" /* 8888 is real, 8889 is debug */ // 'ws://api.myqueenero.xyz:8091' // also the default for ws_transport.real.js
})
const ws_client = new WSClient({
    ws_transport: ws_transport,
    // TODO: save these before/as server shuts down and/or periodically - then read them for here (on launch)
    // optl_persisted__last_confirmed_tx_id_by_addr: optl_persisted__last_confirmed_tx_id_by_addr,
    // optl_persisted__last_confirmed_tx_block_hash_by_addr: optl_persisted__last_confirmed_tx_block_hash_by_addr,
    // optl_persisted__tx_hash_by_confirmed_tx_id_by_addr: optl_persisted__tx_hash_by_confirmed_tx_id_by_addr,
    //
    block_info_cb: function(feed_id, block_height, block_hash, head_tx_id, per_byte_fee, fee_mask)
    {
        // lastReceived_block_height = block_height
        console.log("block_info_cb" , feed_id, block_height, block_hash, head_tx_id, per_byte_fee, fee_mask)
    },
    subscr_initial_info_cb: function(feed_id, optl__req_id, expect_backlog_txs) {},
    subscr_initial_backlog_txs_cb: function(feed_id, optl__req_id, tx)
    {
        _got_tx(tx)
    },
    subscr_initial_error_cb: function(feed_id, req_id, err_code, err_msg)
    {
        console.error("subscr_initial_error_cb: err msg", err_code, err_msg)
        // assert.equal(err_code, WSErrorCode.badRequest);
        // for now:
        _close_wallet() // just close the *entire* wallet because this means there was a fatal 'connection' failure
    },
    unsubscribed_cb: function(feed_id, optl__req_id)
    {
    },
    unsubscr_error_cb: function(feed_id, req_id, err_code, err_msg)
    {
        console.error("unsubscr_error_cb: err msg", err_code, err_msg)
        // wallet is probably already being closed if an unsubscr is happening
    },
    postinitial_tx_cb: function(feed_id, tx)
    {
        _got_tx(tx)
    },
    anonymous_error_cb: function(feed_id, err_code, err_msg)
    {
        console.error("anonymous_error_cb: err msg", err_code, err_msg)
        // TODO? close wallet here ? (are such errors fatal?)
    },
    forget_txs_cb: function(feed_id, for_address, from_tx_id)
    {
        _forget_txs_from(from_tx_id, for_address)
    },
    wallet_status_cb: function(feed_id, for_address, scan_block_height)
    {
        console.log("wallet_status_cb: ", for_address, "scan block height:", scan_block_height)
        // TODO: where for_address is the same as the opened wallet, save scan_block_height to it here for query by endpoints
    },
    confirm_tx_cb: function(feed_id, tx_id, tx_hash, tx_height, tx_block_hash)
    {
        _confirm_tx(tx_id, tx_hash, tx_height, tx_block_hash)
    },
    optl__store_did_forget_txs_cb: function(tx_ids) {}
})
const ws_feed_pool = new WSFeedPool({
    ws_client: ws_client,
    REST_url_base: "https://api.myqueenero.xyz:8443",
    fetch: require("node-fetch"),
    a_ws_did_dc__fn: function(ws_feed_id) 
    {
        if (opened_wallet_struct) {
            if (opened_wallet_struct.ws_feed_id != ws_feed_id) {
                console.warn("A WS did disconnect - but the opened wallet has a different ws_feed_id ("+opened_wallet_struct.ws_feed_id+") than it ("+ws_feed_id+").")
            } else {
                opened_wallet_struct.ws_feed_id = null // since the feed did dc, we (must) know we don't have to publish an 'unsubscribe' in the imminent _close_wallet()
            }
            _close_wallet()
        } else {
            console.warn("A WS did disconnect but no wallet was open.")
        }
    }
})
//
async function __givenOpenWallet_open_ws()
{
    if (opened_wallet_struct == null) {
        throw new Error("Expected non-null opened_wallet_struct in __open_ws")
    }
    // TODO: obtain last_confirmed_tx_id_by_addr, etc from ws_client's store on appropriate events and call __save_wallet_after_delay_unless_canceled
    // console.log("__givenOpenWallet_open_ws("+ optl_persisted__last_confirmed_tx_id+", "+ optl_persisted__last_confirmed_tx_id_by_addr, optl_persisted__last_confirmed_tx_block_hash_by_addr, optl_persisted__tx_hash_by_confirmed_tx_id_by_addr)
    let feed_channel
    try {
        feed_channel = await ws_feed_pool.stepI__get_feed_channel(
            opened_wallet_struct__address(), 
            opened_wallet_struct__view_key__sec()
        )
    } catch(e) {
        console.error("/login error ('" + e + "') … closing wallet.")
        _close_wallet() // closing, first
        throw e // but also throwing so the error can be sent back to the client
    }
    if (opened_wallet_struct == null) {
        throw new Error("Wallet was already closed before ws_client.connect() called")
    }
    const was_connecting_for_wallet_w_addr = opened_wallet_struct.doc.address
    // ^- we can use this to check if the opened_wallet_struct at any future async point is still the same as the one we opened for in this scope
    let ws_feed_id = ws_feed_pool.stepII__connect_with(
        feed_channel, 
        function(ws_feed_id)
        { // when the connection is *actually* open
            // Now that ws is open, we can subscribe for that wallet
            // (but first check if it's the same one!)
            if (!opened_wallet_struct || was_connecting_for_wallet_w_addr !== opened_wallet_struct__address()) {
                console.warn("Opened a WS conn but bailing before opening subscr because either wallet was closed or different wallet was opened")
            } // ^-- note: this doesn't preclude a duplicate subscription being done for the same wallet on a fast close-then-open but the ws teardown on a close_wallet should handle that possibility anyway
            //
            ws_client.send_payload__feed(ws_feed_id, ws_client.new_subscribe_payload({
                address: opened_wallet_struct__address(),
                view_key: opened_wallet_struct__view_key__sec(),
                // "since_confirmed_tx_id is handled internally in the client"
            }))
        }
    )
    if (opened_wallet_struct == null) {
        throw new Error("Wallet was already closed before setting .ws_feed_id")
    }
    opened_wallet_struct.ws_feed_id = ws_feed_id // this does not mean a connect() nor 'subscribe' was actually successful
}
let __is_closing_wallet = false
function _close_wallet()
{
    if (opened_wallet_struct == null) {
        throw new Error("No wallet currently open")
    }
    if (__is_closing_wallet) {
        console.log("Something called by _close_wallet is triggering a _close_wallet()… skipping…")
        return
    }
    __is_closing_wallet = true
    {
        if (opened_wallet_struct.ws_feed_id) { // close any open WS conns for that wallet
            const address = opened_wallet_struct__address()
            if (!address || typeof address == 'undefined') {
                throw "Expected address"
            }
            // NOTE: there is a chance that the opened_wallet_struct got a ws_feed_id but a subscribe was never issued (or it failed) … so the only reason why this works is because one wallet can be open at a time
            ws_client.send_payload__feed(opened_wallet_struct.ws_feed_id, ws_client.new_unsubscribe_payload({
                address: opened_wallet_struct__address()
            }))
    
        } else {
            console.warn("_close_wallet: nil ws_feed_id")
        }
        //
        opened_wallet_struct = null // free/release
    }
    __is_closing_wallet = false
}
//
//
module.exports =
{
    create_wallet: async function(rpc_req_id, params, server, res)
    {
        if (opened_wallet_struct != null) {
            return server._write_error(400, "A wallet is already open - send close_wallet first", res)
        }
        const filename = params.filename
        if (!filename) {
            return server._write_error(400, ".filename required", res)
        }
        const password = params.password
        if (!password) {
            return server._write_error(400, ".password required", res)
        }
        //
        let doc_exists = false
        try {
            doc_exists = await _does_file_exist_named(server.DocumentStore(), filename)
        } catch (err) {
            return server._write_error(500, err, res)
        }
        if (doc_exists) {
            return server._write_error(400, "File with that name already exists", res)
        }
        //
        let lang_code
        try {
            lang_code = mnemonic_language_to_code(params.language)
        } catch (e) {
            return server._write_error(400, "Unknown language", res)
        }
        try {
            var created = (await myqueenero_core.queenero_utils_promise).newly_created_wallet(lang_code, nettype);
        } catch (e) {
            server._write_error(500, e, res)
            console.log(e)
            return
        }
        try {
            await _store_wallet_with(
                server.DocumentStore(),
                filename, password,
                created.address_string,
                created.sec_viewKey_string, 
                created.sec_spendKey_string,
                created.pub_spendKey_string,
                created.pub_viewKey_string,
                created.mnemonic_string, created.mnemonic_language
            )
        } catch (e) {
            console.error(e)
            return server._write_error(500, "Error saving wallet", res)
        }
        try {
            await _open_wallet(server.DocumentStore(), filename, password) // this'll cause a login to occur via a WS conn open + subscr 
        } catch (e) {
            console.error("Returning 500:", e)
            return server._write_error(500, "Internal error opening created & saved wallet:"+e, res)
        }
        server._write_success(rpc_req_id, {/*intentionally empty*/}, res)
    },
    close_wallet: async function(rpc_req_id, params, server, res)
    {
        if (opened_wallet_struct == null) {
            return server._write_error(400, "No wallet is currently open", res)
        }
        try {
            await __givenOpenWallet_write()
        } catch (e) {
            console.error(e)
            server._write_error(400, "Error writing open wallet", res)
            return // without closing wallet -- because maybe memory inspection is desired before process killed .. or it's a once-off and close_wallet will be sent again
        }
        _close_wallet()
        server._write_success(rpc_req_id, {}, res)
    },
    open_wallet: async function(rpc_req_id, params, server, res)
    {
        if (opened_wallet_struct != null) {
            return server._write_error(400, "A wallet is already open - send close_wallet first", res)
        }
        const filename = params.filename
        if (!filename) {
            return server._write_error(400, ".filename required", res)
        }
        const password = params.password
        if (!password) {
            return server._write_error(400, ".password required", res)
        }
        try {
            await _open_wallet(server.DocumentStore(), filename, password) // this'll cause a login to occur via a WS conn open + subscr 
        } catch (e) {
            console.error("Returning 500:", e)
            return server._write_error(500, "Internal error opening wallet", res)
        }
        server._write_success(rpc_req_id, {/*intentionally empty*/}, res)
    },
    restore_deterministic_wallet: async function(rpc_req_id, params, server, res)
    {
        if (opened_wallet_struct != null) {
            return server._write_error(400, "A wallet is already open - send close_wallet first", res)
        }
        const filename = params.filename
        if (!filename) {
            return server._write_error(400, ".filename required", res)
        }
        const password = params.password
        if (!password) {
            return server._write_error(400, ".password required", res)
        }
        const seed = params.seed
        if (!seed) {
            return server._write_error(400, ".seed required", res)
        }
        //
        if (opened_wallet_struct != null) {
            if (req.autosave_current == true) {
                try {
                    await __givenOpenWallet_write()
                } catch (e) {
                    return server._write_error(400, "Error saving existing given .autosave_current flag: " + e, res)
                }
            } else if (req.autosave_current != false) {
                console.warn("Unrecognized .autosave_current of", autosave_current) // TODO? sufficient?
            }
        }

        // TODO: add cryptonote_format_utils::decrypt_key functionality to bridge to implement params.seed_offset if necessary 
        // if (!req.seed_offset.empty())
        // {
        //   recovery_key = cryptonote::decrypt_key(recovery_key, req.seed_offset);
        // }
          // crypto::secret_key decrypt_key(crypto::secret_key key, const epee::wipeable_string &passphrase);

/*

    bool was_deprecated_wallet = ((old_language == crypto::ElectrumWords::old_language_name) ||
                                  crypto::ElectrumWords::get_is_old_style_seed(req.seed));

    std::string mnemonic_language = old_language;
    if (was_deprecated_wallet)
    {
      // The user had used an older version of the wallet with old style mnemonics.
      res.was_deprecated = true;
    }

    if (old_language == crypto::ElectrumWords::old_language_name)
    {
      if (req.language.empty())
      {
        er.code = WALLET_RPC_ERROR_CODE_UNKNOWN_ERROR;
        er.message = "Wallet was using the old seed language. You need to specify a new seed language.";
        return false;
      }
      std::vector<std::string> language_list;
      std::vector<std::string> language_list_en;
      crypto::ElectrumWords::get_language_list(language_list);
      crypto::ElectrumWords::get_language_list(language_list_en, true);
      if (std::find(language_list.begin(), language_list.end(), req.language) == language_list.end() &&
          std::find(language_list_en.begin(), language_list_en.end(), req.language) == language_list_en.end())
      {
        er.code = WALLET_RPC_ERROR_CODE_UNKNOWN_ERROR;
        er.message = "Wallet was using the old seed language, and the specified new seed language is invalid.";
        return false;
      }
      mnemonic_language = req.language;
    }

*/

    // set blockheight if given
    // try
    // {
    //   wal->set_refresh_from_block_height(req.restore_height);




        let doc_exists = false
        try {
            doc_exists = await _does_file_exist_named(server.DocumentStore(), filename)
        } catch (err) {
            return server._write_error(500, err, res)
        }
        if (doc_exists) {
            return server._write_error(400, "File with that name already exists", res)
        }
        //
        let unpacked
        try {
            unpacked = (await myqueenero_core.queenero_utils_promise).seed_and_keys_from_mnemonic(seed, nettype)
		} catch (e) {
            console.log(e)
            return server._write_error(500, e, res)
		}
        let derived_mnemonic
        try {
            derived_mnemonic = (await myqueenero_core.queenero_utils_promise).mnemonic_from_seed(
                unpacked.sec_seed_string, 
                unpacked.mnemonic_language
            )
        } catch (e) {
            console.log(e)
            return server._write_error(500, e, res)
        }
        if (derived_mnemonic != seed) {
            return server._write_error(500, "Expected derived_mnemonic to equal req.seed", res)
        }
        try {
            await _store_wallet_with(
                server.DocumentStore(),
                filename, password,
                unpacked.address_string,
                unpacked.sec_viewKey_string, unpacked.sec_spendKey_string,
                unpacked.pub_spendKey_string, unpacked.pub_viewKey_string,
                derived_mnemonic/*which equals `seed`*/, unpacked.mnemonic_language
            )
        } catch (e) {
            console.error(e)
            return server._write_error(500, "Error saving wallet", res)
        }
        try {
            await _open_wallet(server.DocumentStore(), filename, password) // this'll cause a login to occur via a WS conn open + subscr 
        } catch (e) {
            console.error("Returning 500:", e)
            return server._write_error(500, "Internal error opening created & saved wallet", res)
        }
        server._write_success(rpc_req_id, {
            address: opened_wallet_struct__address(),
            info: "Wallet has been restored successfully.",
            seed: opened_wallet_struct__seed() // actually the mnemonic
            // was_deprecated: false // TODO: implement this (see above)
        }, res)
    }
}
